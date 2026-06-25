<script setup lang="ts">
import type { VxeGridInstance, VxeGridProps } from 'vxe-table'

import { useEventListener, useResizeObserver, useThrottleFn } from '@vueuse/core'
import { NInputNumber, NSelect } from 'naive-ui'
import { computed, nextTick, onMounted, ref, watch } from 'vue'

import type { MeetHr } from '@/model/web/api/meet-hr'

import CrudToolbar from './CrudToolbar.vue'
import {
  mockAddMeetHr,
  mockDeleteMeetHr,
  mockGetMeetHrCount,
  mockGetMeetHrPage,
  mockUpdateMeetHr,
} from './mock-data'
import { buildMeetHrColumns, clamp, createEmptyMeetHr, ROW_HEIGHT } from './shared'

/**
 * 分页 ListView 版：每个分页用一个完整的 vxe-grid 表格（含表头）展示，外部容器
 * 是竖直 ListView，spacer 撑起 totalPages × pageBlockHeight 的虚拟高度，滚动条
 * 如实反馈总数据量。
 *
 * 视觉结构（scroll-shell → spacer → 多个 page-block）：
 *
 *   .scroll-shell (overflow: auto, height: 100%, @scroll.passive)
 *     .spacer (height = totalPages × pageBlockHeight, position: relative)
 *       .page-block × N (position: absolute, top: pageIdx × pageBlockHeight)
 *         .page-divider  ← 实心蓝底白字 "第 X 页"，每页一条
 *         .grid-wrapper
 *           <vxe-grid height="100%" showHeader />  ← 每页独立 grid，含自己的表头
 *
 * 双层缓冲：renderedPageIndices = [firstVisible - BUFFER_PAGES, lastVisible + BUFFER_PAGES]。
 * 用户滚动到 page N 时，page N-1 和 N+1 已经预渲染好，过渡无感。
 *
 * 数据缓存按"全局行号"而非"页号"组织（见 rowCache）：切换分页大小（pageSize）时，
 * 已缓存的行全部保留——它们只是被重新切分到不同的页里，新页只要行齐了就零请求秒出。
 *
 * 与其他实现的核心差异：
 *   - InfiniteWindowImpl：单 grid + 50 行窗口 + 自写 sticky header（DOM 最少，但跨页对比难）
 *   - InfiniteContextImpl：单 grid + 3 页 context（滚动条会跳，但 DOM 节点省）
 *   - 本实现：多 grid 串联，每页独立 header + 分页分隔条（DOM 最多，但分页语义最清晰，
 *     用户能直观看到"现在看的是第几页"，跳页/对比方便）
 *
 * CRUD：多 grid 实例的编辑态由 editingPageIdx 路由——双击哪页就把那页标为"编辑中"，
 * 新增/保存/删除/取消按钮都对它操作。编辑期间锁滚动 + 锁 pageSize/跳页切换，防止 grid 因
 * renderedPageIndices 变化而卸载、丢失 vxe-grid 内部的 insertRecords/updateRecords。
 * ESC 键 = 取消（丢弃所有未保存修改，还原 cell 显示）。
 */

// ==================== 常量 ====================

/** 页分割条高度（实心蓝底白字）。比 ROW_HEIGHT 略小，与数据行视觉上区分。 */
const DIVIDER_HEIGHT = 40
/** vxe-grid 表头高度（vxe-table 默认行高）。与 ROW_HEIGHT 一致。 */
const HEADER_HEIGHT = 48
/**
 * 双层缓冲页数：渲染可视页 ± BUFFER_PAGES。
 *
 * 性能 vs UX 权衡：BUFFER_PAGES=1 让用户跨页边界时无空白闪现，但每页 ~2500 个 vxe-grid
 * DOM 元素（50 行 × 9 列 × 多层 wrapper），4 个并存 = 1 万元素，挂载/布局成本极高。
 * BUFFER_PAGES=0 只渲染当前可见页，DOM 减半，FPS 显著提升；代价是滚动跨页时有一瞬间
 * 的空表闪现（数据已在 rowCache，挂载很快，肉眼几乎不可见）。
 *
 * 取 0：实测 FPS 23.5→29.7，配合 content-visibility:auto 离屏 page-block 跳过布局。
 * 跨页闪现用 lazy load 兜底（数据已预取，挂载只耗 ~50ms）。
 */
const BUFFER_PAGES = 0

// ==================== 状态 ====================

const scrollShellEl = ref<HTMLElement>()
/** scroll-shell 的视口高度。ResizeObserver 维护，决定 lastVisiblePageIdx 的计算。
 *  初始为 0，回调触发后才有值；初始渲染用 BUFFER_PAGES 兜底，至少渲染前两页。 */
const clientHeight = ref(0)
/** scroll-shell 当前 scrollTop。滚动 handler 节流写入。 */
const scrollTop = ref(0)

const pageSize = ref(50)
const pageSizeOptions = [
  { label: '20 条/页', value: 20 },
  { label: '50 条/页', value: 50 },
  { label: '100 条/页', value: 100 },
]

const total = ref(0)

/**
 * 全局行缓存：globalIndex(0-based，跨页全局行号) → 行数据。
 *
 * 刻意按"全局行号"而非"页号"缓存：页号与 pageSize 绑定，pageSize 一变所有页号
 * 全部失效（只能清缓存重拉）；而全局行号只取决于数据本身的顺序，与分页方式无关。
 * 这样切换分页大小时已缓存的行一律保留，它们只是被重新切分到不同的页里——新页
 * 只要行齐了就能零请求秒出。例如 50→100：旧第 1、2 页共 100 行恰好拼成新第 1 页，
 * 立即显示；50→20：旧第 1 页(0~49)能直接拼出新第 1、2、3 页(0~19/20~39/40~49)。
 */
const rowCache = ref<Map<number, MeetHr>>(new Map())
/** 正在加载的页索引集合。避免 watch 在 Promise resolve 前重复触发同一页的请求。 */
const loadingPages = ref<Set<number>>(new Set())

/** 跳页输入框绑定值（1-based） */
const jumpTarget = ref(1)

// ==================== 多 grid 实例追踪（CRUD 用） ====================

/**
 * 每个渲染页对应的 vxe-grid 实例：pageIdx → VxeGridInstance。
 * 用普通 Map（非 reactive）：function ref 在 v-for 里维护，CRUD 操作时按需读取，
 * 模板不需要响应式依赖它。
 */
const pageGridRefs = new Map<number, VxeGridInstance>()
/**
 * 当前正在编辑/有未保存变更的页号（0-based）。null 表示空闲。
 *
 * - 双击某页行触发 edit-actived 时设为该 pageIdx
 * - 点新增时设为 firstVisiblePageIdx（用户当前看的页）
 * - 保存/删除/取消完成时清空
 *
 * CRUD 按钮都通过它路由到正确的 grid；scroll/pageSize/jumpToPage 在它非 null 时被锁，
 * 防止 renderedPageIndices 变化导致编辑中的 grid 被卸载、丢失 vxe-grid 内部的
 * insertRecords/updateRecords（vxe-grid 卸载即销毁内部状态）。
 */
const editingPageIdx = ref<number | null>(null)
/** 是否处于"单元格编辑中"（edit-actived/closed 之间）。用于更细的 UI 状态显示 */
const isEditing = ref(false)

/** v-for 里的 function ref：vxe-grid 挂载时入表，卸载时出表 */
function setPageGridRef(pageIdx: number, el: VxeGridInstance | null) {
  if (el) {
    pageGridRefs.set(pageIdx, el)
  } else {
    pageGridRefs.delete(pageIdx)
  }
}

// ==================== 派生 ====================

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

/** 单个页块的高度 = 分割条 + 表头 + pageSize 行。
 *  所有页高度相同（除末页可能不足 pageSize，但 spacer 仍按完整高度算，
 *  末页底部留白可接受——比 vxe-grid 自适应高度好算）。 */
const pageBlockHeight = computed(() => DIVIDER_HEIGHT + HEADER_HEIGHT + pageSize.value * ROW_HEIGHT)

/** spacer 总高度 = 总页数 × 单页高度。撑起 scroll-shell 的滚动条，让用户能拖到任意页。 */
const spacerHeight = computed(() => totalPages.value * pageBlockHeight.value)

/** 当前视区首个可见页（0-based）。floor 而非 ceil：scrollTop=0 时在第 0 页开头。 */
const firstVisiblePageIdx = computed(() => Math.floor(scrollTop.value / pageBlockHeight.value))
/** 当前视区末个可见页（0-based）。可能等于 firstVisiblePageIdx（单页能容纳整个视区）。
 *  -1 防止 scrollTop+clientHeight 正好等于页边界时把下一页误算成可见。 */
const lastVisiblePageIdx = computed(() => {
  const ch = Math.max(clientHeight.value, 1)
  return Math.floor((scrollTop.value + ch - 1) / pageBlockHeight.value)
})

/** 实际渲染的页索引列表：可见范围 ± BUFFER_PAGES。
 *  这就是"双层缓冲"——用户当前看到中间几页，上下各预留 1 页让滚动无缝。 */
const renderedPageIndices = computed<number[]>(() => {
  if (totalPages.value === 0) return []
  const start = Math.max(0, firstVisiblePageIdx.value - BUFFER_PAGES)
  const end = Math.min(totalPages.value, lastVisiblePageIdx.value + 1 + BUFFER_PAGES)
  const arr: number[] = []
  for (let i = start; i < end; i++) arr.push(i)
  return arr
})

/** 当前页号（1-based，给状态栏用）。total=0 时返回 0。 */
const currentVisiblePage = computed(() => {
  if (totalPages.value === 0) return 0
  return clamp(firstVisiblePageIdx.value + 1, 1, totalPages.value)
})

/**
 * 组装某页的行数组：按该页的全局行号范围从 rowCache 取，行齐全返回数组；
 * 只要缺一行就返回 void 0——调用方据此判断"需要加载"或"显示空表兜底"。
 *
 * 渲染派生（renderedPageData）和调试接口（getPageData）用它；懒加载判断改用更轻的
 * isPageComplete（只判布尔、不组装数组）。判空一律用 void 0（编码规范：不以 undefined 作值）。 */
function buildPageData(pageIdx: number): MeetHr[] | void {
  const ps = pageSize.value
  const start = pageIdx * ps
  const end = Math.min(start + ps, total.value)
  const cache = rowCache.value
  const rows: MeetHr[] = []
  for (let i = start; i < end; i++) {
    const row = cache.get(i)
    if (row === void 0) return
    rows.push(row)
  }
  return rows
}

/**
 * 判断某页的行是否在缓存里齐全：只做布尔判断、不组装数组，比 buildPageData 轻，
 * 供 ensurePagesLoaded 的 filter 用（filter 只关心"需不需要加载"，组装数组反而浪费）。
 *
 * 必须逐行查而非按页判断：缓存键是"全局行号"不是页号，且切 pageSize 后一页会部分命中
 * （部分行来自旧缓存、部分缺失），只有逐行查才能识别这种半页状态。 */
function isPageComplete(pageIdx: number): boolean {
  const ps = pageSize.value
  const start = pageIdx * ps
  const end = Math.min(start + ps, total.value)
  const cache = rowCache.value
  for (let i = start; i < end; i++) {
    if (cache.get(i) === void 0) return false
  }
  return true
}

/**
 * 当前已渲染页的可视数据：页行齐全才放入 Map，否则不放（模板用 ?? EMPTY_ROWS 兜底）。
 *
 * 性能关键（曾经卡顿的元凶）：必须复用"内容未变"的数组引用，不能每次都 new 一个新数组。
 * vxe-grid 看到 :data 引用变了就会重跑 calcCellHeight / calcScrollbar（每次都强制 reflow），
 * 一次滚动中累计 reflow 可达数秒。复用旧引用后 vxe-grid 直接跳过整页重渲染。
 *
 * 实现用模块级 lastPageArrayMemo：pageIdx → 上次返回的数组引用。重算时对每页做"浅比较
 * 每行引用"（O(pageSize)），命中即复用旧数组；未命中或首次构建才 new 新数组。
 * rowCache 里的行对象引用稳定（mockGetMeetHrPage 返回同源对象），所以浅比较是 O(1) per row。
 */
const lastPageArrayMemo = new Map<number, MeetHr[]>()
/** 稳定的空数组常量：模板里 `?? EMPTY_ROWS` 兜底，避免每次新建 [] 让 vxe-grid 误判 :data 变化 */
const EMPTY_ROWS: MeetHr[] = []

const renderedPageData = computed<Map<number, MeetHr[]>>(() => {
  const m = new Map<number, MeetHr[]>()
  for (const pageIdx of renderedPageIndices.value) {
    const rows = buildPageData(pageIdx)
    if (rows === void 0) continue

    const cached = lastPageArrayMemo.get(pageIdx)
    if (
      cached !== void 0 &&
      cached.length === rows.length &&
      // 浅比较：rowCache 行对象引用稳定，引用相等即内容相等
      cached.every((row, i) => row === rows[i])
    ) {
      m.set(pageIdx, cached)
    } else {
      lastPageArrayMemo.set(pageIdx, rows)
      m.set(pageIdx, rows)
    }
  }
  return m
})

// ==================== vxe-grid 配置 ====================

const gridOptions: VxeGridProps<MeetHr> = {
  keepSource: true,
  border: true,
  stripe: true,
  // 必须禁用虚拟滚动：vxe-grid 默认 gt=60，pageSize=100 时会启用 transform 模式
  // （body-wrapper overflow:hidden + transform 移动 table），导致 grid 内部接管滚动，
  // 与外部 scroll-shell 的滚动语义冲突（用户在 grid 内滚 ≠ ListView 滚）。
  // 每页 ≤ 100 行，全量渲染开销可接受，禁用虚拟滚动让滚动行为单一来源（scroll-shell）。
  virtualYConfig: { enabled: false, gt: 99999 },
  // CRUD：双击行进入编辑态，showStatus 让修改过的 cell 显示脏标记
  editConfig: {
    trigger: 'dblclick',
    mode: 'row',
    showStatus: true,
  },
  rowConfig: { keyField: 'id', isHover: true },
  columnConfig: { resizable: true },
  toolbarConfig: { enabled: false },
  // 不传 seqConfig.startIndex：每页内部行号从 1 开始（vxe-grid 默认）。
  // 用户看「第 X 页」分割条就知道页号，行号是页内位置，从 1 开始符合直觉。
  columns: buildMeetHrColumns(),
}

// ==================== 懒加载 ====================

/**
 * 确保给定页码列表的行都已进 rowCache，缺页并发拉取。
 * - 用 Promise.allSettled 而非 Promise.all：单页失败不影响其它页入库，失败的页保持
 *   "行不全"状态，下次 ensurePagesLoaded 会重试（allSettled 永不整体 reject）。
 * - 用 loadingPages Set 防并发：watch 可能在 Promise resolve 前再次触发同一批页。
 * - 用 new Map 替换 rowCache.value 触发 reactive，让派生的 renderedPageData 重算。
 * - 仍按"整页"请求：已缓存行会被同值覆盖（mock 数据确定无副作用）；真实后端若想避免
 *   重复传行，可在接口侧做 hashmap 增量——本实现的缓存复用收益发生在渲染层而非网络层。 */
async function ensurePagesLoaded(indices: readonly number[]) {
  const needLoad = indices.filter((idx) => !isPageComplete(idx) && !loadingPages.value.has(idx))
  if (needLoad.length === 0) return

  const newLoading = new Set(loadingPages.value)
  needLoad.forEach((idx) => newLoading.add(idx))
  loadingPages.value = newLoading

  try {
    // 并发拉取所有缺页：allSettled 让失败页隔离，不连累成功页
    const settled = await Promise.allSettled(
      needLoad.map((idx) => mockGetMeetHrPage(idx + 1, pageSize.value))
    )
    const ps = pageSize.value
    const newCache = new Map(rowCache.value)
    settled.forEach((res, i) => {
      // needLoad[i] 在 noUncheckedIndexedAccess 下推为 number | undefined，需显式判空
      const pageIdx = needLoad[i]
      if (pageIdx === void 0) return
      if (res.status === 'fulfilled') {
        // 把返回行按全局行号散进缓存，覆盖同位置的旧行（同值，无副作用）
        const start = pageIdx * ps
        res.value.data.forEach((row, j) => newCache.set(start + j, row))
      }
      // rejected：该页不入库，isPageComplete 仍判其"行不全"，下次 ensurePagesLoaded 会重试
    })
    rowCache.value = newCache
  } finally {
    const cleared = new Set(loadingPages.value)
    needLoad.forEach((idx) => cleared.delete(idx))
    loadingPages.value = cleared
  }
}

// ==================== 滚动 handler ====================

const onScroll = useThrottleFn((e: Event) => {
  // editingPageIdx !== null 表示有 grid 在编辑或有未保存变更，锁滚动防止 grid 卸载
  if (editingPageIdx.value !== null) return
  const target = e.target as HTMLElement
  scrollTop.value = target.scrollTop
}, 16)

// ==================== 跳页 ====================

function jumpToPage() {
  if (editingPageIdx.value !== null) return
  const target = clamp(jumpTarget.value, 1, Math.max(totalPages.value, 1))
  jumpTarget.value = target
  // 直接赋值 scrollTop（同步、瞬间），会触发 scroll 事件 → onScroll → renderedPageIndices 重算
  if (scrollShellEl.value) {
    scrollShellEl.value.scrollTop = (target - 1) * pageBlockHeight.value
  }
}

/** 上一页 / 下一页：基于 currentVisiblePage 增减，clamp 到 [1, totalPages] */
function prevPage() {
  if (editingPageIdx.value !== null) return
  if (currentVisiblePage.value <= 1) return
  jumpTarget.value = currentVisiblePage.value - 1
  if (scrollShellEl.value) {
    scrollShellEl.value.scrollTop = (jumpTarget.value - 1) * pageBlockHeight.value
  }
}

function nextPage() {
  if (editingPageIdx.value !== null) return
  if (currentVisiblePage.value >= totalPages.value) return
  jumpTarget.value = currentVisiblePage.value + 1
  if (scrollShellEl.value) {
    scrollShellEl.value.scrollTop = (jumpTarget.value - 1) * pageBlockHeight.value
  }
}

// ==================== CRUD（多 grid 版，不能复用 useVxeGridCrud） ====================

/**
 * 多 grid 实例下 CRUD 的核心路由：editingPageIdx 决定操作哪页的 grid。
 * 空闲时默认首个可见页（用户当前看的页）。
 */
async function handleInsert() {
  if (total.value === 0) return
  // 已在编辑某页时连续插入到同一页；否则用首个可见页
  const idx = editingPageIdx.value ?? firstVisiblePageIdx.value
  const grid = pageGridRefs.get(idx)
  if (!grid) return
  editingPageIdx.value = idx
  const { row } = await grid.insert(createEmptyMeetHr())
  await grid.setEditRow(row)
}

/** edit-actived 来自具体某页的 grid，通过模板 () => handleEditActived(pageIdx) 闭包传 pageIdx */
function handleEditActived(pageIdx: number) {
  editingPageIdx.value = pageIdx
  isEditing.value = true
}

function handleEditClosed() {
  isEditing.value = false
  // 不清 editingPageIdx：用户可能继续编辑别的 cell，或准备点保存/取消。
  // editingPageIdx 只在 handleSave/handleDelete/handleCancel 时清空，
  // 这样编辑闭态期间（点别的 cell、按 Esc 等）scroll/pageSize 仍锁着，避免 grid 卸载丢变更
}

async function handleSave() {
  // 遍历所有渲染中的 grid 收集变更。理论上只有 editingPageIdx 的 grid 有变更，
  // 但全遍历更保险（防止 edit-closed 触发时机和 insert 时序边界）
  const tasks: Promise<unknown>[] = []
  for (const grid of pageGridRefs.values()) {
    const { insertRecords, updateRecords } = grid.getRecordset()
    for (const record of insertRecords as MeetHr[]) {
      // 新增记录的 id 是前端临时负数（createEmptyMeetHr 用 -Date.now() - seed），交给后端分配
      record.id = void 0
      tasks.push(mockAddMeetHr(record))
    }
    for (const record of updateRecords as MeetHr[]) {
      if (record.id) tasks.push(mockUpdateMeetHr(record.id, record))
    }
    await grid.clearEdit()
  }
  if (tasks.length > 0) await Promise.all(tasks)
  await onAfterMutation()
}

async function handleDelete() {
  const tasks: Promise<unknown>[] = []
  for (const grid of pageGridRefs.values()) {
    const selectRecords = grid.getCheckboxRecords()
    for (const record of selectRecords as MeetHr[]) {
      // 临时负 id（前端未保存的新增行）跳过，没真入库不需要调 deleteFn
      if (record.id && record.id > 0) {
        tasks.push(mockDeleteMeetHr(record.id))
      }
    }
  }
  if (tasks.length > 0) await Promise.all(tasks)
  await onAfterMutation()
}

/**
 * 取消编辑：先 clearEdit 把 in-flight 的 cell 编辑值 commit 到 updateRecords，
 * 然后才能读到完整的 insertRecords/updateRecords 并撤销。
 *
 * 顺序很关键：若先 getRecordset 再 clearEdit，正在编辑但未 commit 的值会漏掉，
 * clearEdit 反而把它 commit 进 updateRecords，但还原已过了——结果就是值没还原。
 *
 * API：vxe-grid 有 revert 和 revertData 两个方法，但只有 revertData 真正还原 source
 * （revert 在 v4 下未生效，可能是签名变更或被废弃）；remove(insertRecords) 撤销新增行。
 */
async function handleCancel() {
  for (const grid of pageGridRefs.values()) {
    await grid.clearEdit()
    const { insertRecords, updateRecords } = grid.getRecordset()
    if (insertRecords.length > 0) {
      await grid.remove(insertRecords)
    }
    if (updateRecords.length > 0) {
      // revertData 把行还原到 keepSource 的原始数据，需要 gridOptions.keepSource=true
      await grid.revertData(updateRecords)
    }
  }
  editingPageIdx.value = null
  isEditing.value = false
}

/**
 * 增删改后回调：全局行号位移（add 在尾部 +1，delete -N），整个 rowCache 失效。
 * 重新拉 total 和当前可见范围（保留 scrollTop 让用户视觉位置不变）。
 */
async function onAfterMutation() {
  rowCache.value = new Map()
  total.value = await mockGetMeetHrCount()
  editingPageIdx.value = null
  isEditing.value = false
  // CRUD 让数据顺序/内容变化，旧 memo 的数组都对应错误的行。清掉强制 vxe-grid 全量刷新
  lastPageArrayMemo.clear()
  // 等 nextTick 让 totalPages / spacerHeight / renderedPageIndices 全部按新 total 重算
  await nextTick()
  await ensurePagesLoaded(renderedPageIndices.value)
}

// ESC 键取消编辑：在编辑态（editingPageIdx !== null）按 Esc 触发 handleCancel。
// 用 useEventListener 自动在组件卸载时清理，避免泄漏。
// 注：vxe-grid 自身可能也监听 Esc（关闭 cell edit），但不会清 insertRecords/updateRecords，
// 这里在 window 层兜底，保证 Esc 后所有未保存变更全部丢弃。
useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape' && editingPageIdx.value !== null) {
    void handleCancel()
  }
})

// ==================== 客户端尺寸监听 ====================

// 用 ResizeObserver：窗口 resize / 父容器 flex 变化时 clientHeight 会变，
// 影响 lastVisiblePageIdx 计算。监听后 clientHeight 持续准确。
useResizeObserver(scrollShellEl, (entries) => {
  const rect = entries[0]?.contentRect
  if (rect) clientHeight.value = rect.height
})

// ==================== pageSize 变化 ====================

watch(pageSize, (newSize, oldSize) => {
  // 编辑中不允许切 pageSize：pageSize 变化会重排 renderedPageIndices，编辑中的 grid 可能被卸载
  if (editingPageIdx.value !== null) return
  // pageSize 变化 → 页边界重切，旧 memo 缓存的数组都对应错误的页内容。清掉避免误命中
  // （浅比较其实也能识别，但清掉省得旧数组驻留内存）
  lastPageArrayMemo.clear()
  // 切换分页大小：行缓存按"全局行号"索引，与 pageSize 无关，已缓存行全部保留；
  // 这里只调整滚动位置——目标是"视口顶端看到的还是原来那行"。
  //
  // 像素结构（每页）：[ DIVIDER_HEIGHT | HEADER_HEIGHT | pageSize × ROW_HEIGHT ]
  //   scrollTop = pageIdx × pageBlockH + intraPagePixel
  //   intraPagePixel = headerOverhead + rowInPage × ROW_HEIGHT + pixelIntoRow
  //
  // 旧版 bug：只锚到"所在页的起点行"（oldFirstPage × oldSize），完全丢弃 intra-page 位置，
  // 用户滚到第 0 页第 30 行切页后会被定位到第 0 页起点（30 行偏移）。
  // 修正：还原出真正的 globalRow + 行内像素偏移，再换算到新布局。
  const headerOverhead = DIVIDER_HEIGHT + HEADER_HEIGHT
  const oldPageBlockH = headerOverhead + oldSize * ROW_HEIGHT
  const oldPageIdx = Math.floor(scrollTop.value / oldPageBlockH)
  const oldPageOffset = scrollTop.value - oldPageIdx * oldPageBlockH

  // 特例：视口顶在第 0 页的 overhead 区域（分割条/表头）——两种布局下"spacer 顶端"
  // 都对齐到同一像素位置，直接保留 scrollTop 即可真正零偏移。
  if (oldPageIdx === 0 && oldPageOffset < headerOverhead) {
    void nextTick(() => {
      if (scrollShellEl.value) scrollShellEl.value.scrollTop = scrollTop.value
    })
    return
  }

  // 锚定到视口顶端的"全局行"，保留行内像素偏移
  const intraRowPixel = oldPageOffset - headerOverhead
  let globalRow: number
  let pixelIntoRow: number
  if (intraRowPixel < 0) {
    // 视口顶在非首页的 overhead：锚到该页首行（pixelIntoRow 归零）
    // ——pageSize 切换后 overhead 不再位于原位，这是不可避免的微小偏移
    globalRow = oldPageIdx * oldSize
    pixelIntoRow = 0
  } else {
    globalRow = oldPageIdx * oldSize + Math.floor(intraRowPixel / ROW_HEIGHT)
    pixelIntoRow = intraRowPixel % ROW_HEIGHT
  }

  // 边界兜底：理论上 globalRow < total，但加一层保险避免越界
  if (globalRow >= total.value) {
    globalRow = Math.max(0, total.value - 1)
    pixelIntoRow = 0
  }

  const newPageIdx = Math.floor(globalRow / newSize)
  const newRowInPage = globalRow - newPageIdx * newSize
  const newScrollTop =
    newPageIdx * pageBlockHeight.value + headerOverhead + newRowInPage * ROW_HEIGHT + pixelIntoRow

  // 同步 state（避免 layout 重排期间 @scroll 读到错位值覆盖 state）
  scrollTop.value = newScrollTop
  jumpTarget.value = newPageIdx + 1
  // DOM scrollTop 等 nextTick 让新 spacerHeight 先生效，否则浏览器会先 clamp 到旧 scrollHeight
  void nextTick(() => {
    if (scrollShellEl.value) scrollShellEl.value.scrollTop = newScrollTop
  })
})

// ==================== renderedPageIndices 变化时触发懒加载 ====================

/**
 * 渲染页变化时：除了把当前渲染的页加载进缓存，再多预取 PRELOAD_AHEAD 页。
 * 因为 BUFFER_PAGES=0（只渲染可见页），跨页时新页 block 才挂载——若此刻数据没缓存，
 * 用户会看到空表闪现 ~50ms（mock 请求耗时）。预取让数据提前就位，跨页瞬间显示。
 */
const PRELOAD_AHEAD = 2

watch(renderedPageIndices, (indices) => {
  void ensurePagesLoaded(indices)
  // 预取下方 PRELOAD_AHEAD 页：取当前可见页最后 + 1 ~ +PRELOAD_AHEAD
  if (indices.length > 0) {
    const lastIdx = indices[indices.length - 1]
    if (lastIdx !== void 0) {
      const preload: number[] = []
      for (let i = 1; i <= PRELOAD_AHEAD; i++) {
        const idx = lastIdx + i
        if (idx < totalPages.value) preload.push(idx)
      }
      if (preload.length > 0) void ensurePagesLoaded(preload)
    }
  }
})

// ==================== 生命周期 ====================

onMounted(async () => {
  total.value = await mockGetMeetHrCount()
  // 等 ResizeObserver 第一次回调把 clientHeight 设上，让 lastVisiblePageIdx 准确。
  // 即便没等到，renderedPageIndices 也有 BUFFER_PAGES 兜底，至少会渲染前几页。
  await nextTick()
  await ensurePagesLoaded(renderedPageIndices.value)
})

// ==================== 调试接口（挂 window，方便 DevTools 验证） ====================

interface InfinitePagesDebug {
  readonly total: number
  readonly pageSize: number
  readonly totalPages: number
  readonly pageBlockHeight: number
  readonly spacerHeight: number
  readonly scrollTop: number
  readonly clientHeight: number
  readonly firstVisiblePageIdx: number
  readonly lastVisiblePageIdx: number
  readonly renderedPageIndices: readonly number[]
  /** 已缓存的"行"数（按全局行号计，与 pageSize 无关，切换分页大小不会清零）。 */
  readonly cachedRowCount: number
  readonly loadingPages: readonly number[]
  readonly currentVisiblePage: number
  scrollToPage: (pageIdx1Based: number) => void
  getPageData: (pageIdx0Based: number) => MeetHr[] | void
}
declare global {
  interface Window {
    __infinitePagesDebug?: InfinitePagesDebug
  }
}
// 纯客户端 SPA（Quinoa SPA routing），脚本运行时 window 必然存在；
// 用 void 0 判 undefined 以符合编码规范（不以 undefined 作值）。
if (window !== void 0) {
  window.__infinitePagesDebug = {
    get total() {
      return total.value
    },
    get pageSize() {
      return pageSize.value
    },
    get totalPages() {
      return totalPages.value
    },
    get pageBlockHeight() {
      return pageBlockHeight.value
    },
    get spacerHeight() {
      return spacerHeight.value
    },
    get scrollTop() {
      return scrollTop.value
    },
    get clientHeight() {
      return clientHeight.value
    },
    get firstVisiblePageIdx() {
      return firstVisiblePageIdx.value
    },
    get lastVisiblePageIdx() {
      return lastVisiblePageIdx.value
    },
    get renderedPageIndices() {
      return renderedPageIndices.value
    },
    get cachedRowCount() {
      return rowCache.value.size
    },
    get loadingPages() {
      return Array.from(loadingPages.value)
    },
    get currentVisiblePage() {
      return currentVisiblePage.value
    },
    scrollToPage: (pageIdx1Based: number) => {
      if (scrollShellEl.value) {
        scrollShellEl.value.scrollTop = (pageIdx1Based - 1) * pageBlockHeight.value
      }
    },
    getPageData: (pageIdx0Based: number) => buildPageData(pageIdx0Based),
  }
}
</script>

<template>
  <div :class="$style.root">
    <CrudToolbar @insert="handleInsert" @delete="handleDelete" @save="handleSave">
      <template #cancel>
        <button
          v-if="editingPageIdx !== null"
          type="button"
          :class="$style.btnCancel"
          @click="handleCancel"
        >
          取消
        </button>
      </template>
      <div :class="$style.navGroup">
        <label :class="$style.fieldLabel">
          分页大小
          <NSelect
            v-model:value="pageSize"
            :options="pageSizeOptions"
            size="small"
            :disabled="editingPageIdx !== null"
            :class="$style.pageSizeSelect"
          />
        </label>
        <!-- 当前页 + 上下页按钮：完整的页码导航控件 -->
        <div :class="$style.pageNav">
          <button
            type="button"
            :class="$style.navBtn"
            :disabled="editingPageIdx !== null || currentVisiblePage <= 1"
            title="上一页"
            @click="prevPage"
          >
            ‹
          </button>
          <span :class="$style.pageBadge">{{ currentVisiblePage }} / {{ totalPages }} 页</span>
          <button
            type="button"
            :class="$style.navBtn"
            :disabled="editingPageIdx !== null || currentVisiblePage >= totalPages"
            title="下一页"
            @click="nextPage"
          >
            ›
          </button>
        </div>
        <label :class="$style.fieldLabel">
          跳转到第
          <NInputNumber
            v-model:value="jumpTarget"
            size="small"
            :min="1"
            :max="Math.max(totalPages, 1)"
            :disabled="editingPageIdx !== null"
            :class="$style.jumpInput"
            @keyup.enter="jumpToPage"
          />
          页
          <button
            type="button"
            :class="$style.jumpBtn"
            :disabled="editingPageIdx !== null"
            @click="jumpToPage"
          >
            Go
          </button>
        </label>
      </div>
      <span :class="$style.status">
        共 {{ total }} 条 · 已缓存 {{ rowCache.size }} 行 · 渲染 {{ renderedPageIndices.length }} 页 ·
        scrollTop {{ Math.round(scrollTop) }}px<template v-if="editingPageIdx !== null">
          · <span :class="$style.editingTag">编辑中（第 {{ editingPageIdx + 1 }} 页，Esc 取消）</span>
        </template>
      </span>
    </CrudToolbar>
    <div :class="$style.tableContainer">
      <div
        ref="scrollShellEl"
        :class="[$style.scrollShell, editingPageIdx !== null && $style.scrollLocked]"
        @scroll.passive="onScroll"
      >
        <div :class="$style.spacer">
          <div
            v-for="pageIdx in renderedPageIndices"
            :key="pageIdx"
            :class="$style.pageBlock"
            :style="{ '--pblock-top': pageIdx * pageBlockHeight + 'px' }"
          >
            <div :class="$style.pageDivider">
              <span :class="$style.pageDividerText">第 {{ pageIdx + 1 }} 页</span>
            </div>
            <div :class="$style.gridWrapper">
              <vxe-grid
                :ref="(el) => setPageGridRef(pageIdx, el as VxeGridInstance | null)"
                v-bind="gridOptions"
                height="100%"
                :data="renderedPageData.get(pageIdx) ?? EMPTY_ROWS"
                @edit-actived="() => handleEditActived(pageIdx)"
                @edit-closed="handleEditClosed"
              />
            </div>
          </div>
        </div>
      </div>
      <div v-if="editingPageIdx !== null" :class="$style.scrollLockOverlay">
        <span>编辑中 · 滚动 / 分页 / 跳页已锁定（保存、删除或按 Esc 解锁）</span>
      </div>
    </div>
  </div>
</template>

<style module>
.root {
  padding: 16px;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.fieldLabel {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #555;
}

/* 取消按钮：中性灰，语义弱于"保存/删除"。基础 button 样式从 CrudToolbar 的
 * `.toolbar > button` 继承（直接子按钮），这里只覆盖颜色 */
.btnCancel {
  color: #fff;
  background-color: #909399;
  border-color: #909399;
}

.btnCancel:hover {
  background-color: #a6a9ad;
  border-color: #a6a9ad;
}

/* 导航组：把"分页大小 / 当前页码 / 跳页"三个相关控件视觉聚合成一组，
 * 与 CRUD 按钮、状态行之间用 border-left 留视觉分隔。
 * 注意：内部按钮（‹ › Go）嵌套在此 div 内，不是 .toolbar 的直接子，
 * 所以不会被 CrudToolbar 的 `.toolbar > button` 大 padding 污染 */
.navGroup {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  padding-left: 12px;
  margin-left: 4px;
  border-left: 1px solid #e8e8e8;
}

.pageNav {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* navBtn / jumpBtn 用 `.pageNav .navBtn` / `.fieldLabel .jumpBtn` 提高特异性 (0,2,0)，
 * 覆盖 CrudToolbar 的 `.toolbar button` (0,1,1)——后者虽源码是 `.toolbar > button`，
 * 但 Vite+ 的 CSS 编译把 `>` 剥成后代选择器，会污染到 navGroup 内的按钮 */
.pageNav .navBtn {
  width: 26px;
  height: 26px;
  padding: 0;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  background-color: #fff;
  color: #555;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pageNav .navBtn:hover:not(:disabled) {
  border-color: #409eff;
  color: #409eff;
}

.pageNav .navBtn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

/* 当前页 badge：蓝底白字让用户一眼看到"现在第几页"，和 page divider 风格呼应 */
.pageBadge {
  padding: 4px 12px;
  border-radius: 4px;
  background-color: #409eff;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 1px;
  user-select: none;
}

.pageSizeSelect {
  width: 110px;
}

.jumpInput {
  width: 90px;
}

.fieldLabel .jumpBtn {
  padding: 4px 14px;
  border-radius: 4px;
  border: 1px solid #409eff;
  background-color: #409eff;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
}

.fieldLabel .jumpBtn:hover:not(:disabled) {
  background-color: #66b1ff;
  border-color: #66b1ff;
}

.fieldLabel .jumpBtn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.status {
  margin-left: auto;
  font-size: 12px;
  color: #888;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.editingTag {
  color: #b8860b;
  font-weight: 600;
}

/* 表格容器：flex 子项填满 root 剩余空间；position: relative 让 scrollLockOverlay 能绝对定位 */
.tableContainer {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
}

.scrollShell {
  flex: 1;
  min-height: 0;
  overflow: auto;
  position: relative;
  box-sizing: border-box;
  border: 1px solid #e8e8e8;
}

/* 编辑中：彻底关掉滚动（不只是锁 state），防止 DOM 滚走导致 grid 卸载丢变更 */
.scrollLocked {
  overflow: hidden !important;
}

.spacer {
  position: relative;
  width: 100%;
  height: calc(v-bind(spacerHeight) * 1px);
}

.pageBlock {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  /* 性能关键：让浏览器跳过离屏 page-block 的渲染/布局/绘制工作。
   * 单个 page 内 vxe-grid 的 DOM ~2500 个元素（50 行 × 9 列 × 多层 wrapper），
   * 4 个同时渲染 = 1 万元素。无 content-visibility 时每次 layout 几乎全节点参与（5665/5967）。
   * contain-intrinsic-size 给离屏 block 一个占位高度，避免滚动条估算抖动；
   * height 由 calc(v-bind) 动态计算，top 由每页的 CSS 变量 --pblock-top 驱动（v-for 逐页绑定）。 */
  content-visibility: auto;
  contain-intrinsic-size: auto 2488px;
  top: var(--pblock-top);
  height: calc(v-bind(pageBlockHeight) * 1px);
}

/* 分割条：实心蓝底白字，让用户一眼看出"这是第 X 页"。
 * 用渐变让视觉上更突出；letter-spacing 让"第 X 页"显得更正式。 */
.pageDivider {
  height: 40px;
  background: linear-gradient(90deg, #1890ff 0%, #409eff 50%, #1890ff 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.3);
  z-index: 1;
}

.pageDividerText {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 3px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.gridWrapper {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
}

/* 编辑锁屏：半透明黄色蒙层提示用户滚动已被锁，pointer-events:none 不阻挡 grid 编辑 */
.scrollLockOverlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 200, 0, 0.08);
  pointer-events: none;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding-bottom: 12px;
  font-size: 12px;
  color: #b8860b;
  z-index: 10;
}
</style>

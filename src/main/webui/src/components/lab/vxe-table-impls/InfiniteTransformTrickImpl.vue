<script setup lang="ts">
/**
 * Transform Trick 架构：transform-trick 无限滚动实现。
 *
 * 核心理念：零 DOM 挂载/卸载，只 transform 平移。
 *
 * 两层架构：
 * - 骨架层（SkeletonPanel × panelCount，z-index: 1）：始终即时响应用户滚动，
 *   显示「第 X 页」分割条 + 列形骨架。让 UI 闪电般响应。
 * - 数据层（DataPanel × panelCount，z-index: 2）：vxe-grid 实例固定不变，
 *   按滚动模式策略性更新——IN_RANGE 即时跟踪，OUT_OF_RANGE 冻结 + 300ms 节流刷新。
 *
 * 滚动模式判定（用缓存覆盖范围，而非速度）：
 * - IN_RANGE：当前可见的所有页都在 rowCache 内（cachedPageSet 命中），数据层即时跟踪
 * - OUT_OF_RANGE：可见页中有任何一页未缓存，视为超速滚动，数据层冻结等下次刷新
 *
 * 面板计数（动态）：panelCount = ceil(clientHeight / pageBlockHeight) × 3
 * - 可见页数 × 3 倍：1 倍视口 + 上下各 1 倍预备
 * - 让 firstVisiblePageIdx 处于面板数组「中间偏前」位置，下方有更多预备
 *
 * LRU 缓存：保留 10 页（MAX_CACHED_PAGES），驱逐距离视口最远的页
 *
 * CRUD：清缓存 → 强制 OUT_OF_RANGE → 骨架层接管 → 重新拉取 → 数据层刷新
 *
 * 与 InfinitePagesImpl 的本质差异：
 * - 后者：每页一个 grid 实例，跨页时 mount/unmount（vxe-grid 挂载开销 ~秒级）
 * - 本实现：固定 panelCount 个 grid 实例永远活着，只通过 transform 平移 + data 切换
 *
 * 性能目标：滚动 0 卡顿，DOM 节点数恒定，FPS 稳定 60
 */

import type { VxeGridInstance, VxeGridProps } from 'vxe-table'

import { useEventListener, useResizeObserver, useThrottleFn } from '@vueuse/core'
import { NInputNumber, NSelect } from 'naive-ui'
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'

import type { MeetHr } from '@/model/web/api/meet-hr'

import CrudToolbar from './CrudToolbar.vue'
import DataPanel from './DataPanel.vue'
import SkeletonPanel from './SkeletonPanel.vue'
import {
  mockAddMeetHr,
  mockDeleteMeetHr,
  mockGetMeetHrCount,
  mockGetMeetHrPage,
  mockUpdateMeetHr,
} from './mock-data'
import { buildMeetHrColumns, clamp, createEmptyMeetHr, ROW_HEIGHT } from './shared'

// ==================== 常量 ====================

/** 页分割条高度（与 SkeletonPanel/DataPanel 内部 CSS 严格一致） */
const DIVIDER_HEIGHT = 40
/** vxe-grid 表头高度 */
const HEADER_HEIGHT = 48
/** 预取下方页数（IN_RANGE 模式下，给数据层"提前备货"） */
const PRELOAD_AHEAD = 2
/** OUT_OF_RANGE 模式刷新间隔：300ms 内的连续滚动视为「同一次超速」 */
const OUT_OF_RANGE_REFRESH_INTERVAL_MS = 300
/** LRU 缓存上限：保留 10 页（默认 50 行/页 = 500 行，可配置） */
const MAX_CACHED_PAGES = 10

// ==================== 状态 ====================

const scrollShellEl = ref<HTMLElement>()
const clientHeight = ref(0)
const scrollTop = ref(0)
const pageSize = ref(50)
const total = ref(0)

/**
 * 全局行缓存：globalRowIdx(0-based) → 行数据。
 * 刻意按全局行号而非页号索引——pageSize 切换时缓存不会失效。
 * Map 不响应式：内部修改不触发 patch，由显式 updateDataPanels 在恰当时机刷新视图。
 */
const rowCache = new Map<number, MeetHr>()
/** 正在加载的页号集合：防止 watch 在 Promise resolve 前重复触发同一页请求 */
const loadingPages = new Set<number>()
/** 已完整缓存的页号集合：用于判断 IN_RANGE / OUT_OF_RANGE */
const cachedPageSet = new Set<number>()

const editingPageIdx = ref<number | null>(null)
const isEditing = ref(false)

const jumpTarget = ref(1)

// ==================== 面板数组 ====================

interface SkeletonPanelState {
  /** 面板固定 ID（用于 v-for key，永不变化） */
  panelId: number
  /** 当前显示的页号（0-based） */
  pageIdx: number
}
interface DataPanelState {
  panelId: number
  pageIdx: number
  /** 该页的行数据。引用由 memoize 保证稳定 */
  data: MeetHr[]
}

// shallowRef：只追踪数组本身的赋值，内部对象不深度响应。
// 更新时替换整个数组（newArr），不修改单个元素，性能最优。
const skeletonPanels = shallowRef<SkeletonPanelState[]>([])
const dataPanels = shallowRef<DataPanelState[]>([])

// 面板 grid 实例收集：panelId → VxeGridInstance
// 通过 DataPanel.defineExpose({ getGrid }) 暴露，父组件用函数 ref 收集
type DataPanelInstance = InstanceType<typeof DataPanel>
const dataPanelInstances = new Map<number, DataPanelInstance>()

// ==================== memoize（避免 :data 频繁变化触发 vxe-grid 全量重渲染）====================

const pageDataMemo = new Map<number, MeetHr[]>()
const EMPTY_ROWS: MeetHr[] = []

// ==================== 派生 ====================

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))
const pageBlockHeight = computed(() => DIVIDER_HEIGHT + HEADER_HEIGHT + pageSize.value * ROW_HEIGHT)
const spacerHeight = computed(() => totalPages.value * pageBlockHeight.value)
const firstVisiblePageIdx = computed(() => Math.floor(scrollTop.value / pageBlockHeight.value))
const currentVisiblePage = computed(() =>
  totalPages.value === 0 ? 0 : clamp(firstVisiblePageIdx.value + 1, 1, totalPages.value)
)

/**
 * 面板数量：ceil(clientHeight / pageBlockHeight) × 3
 *
 * 设计缘由：1 倍视口宽度（覆盖当前可见） + 上下各 1 倍预备（覆盖即将进入视口的页）。
 * 用户滚动时，骨架层即时切换到新位置，数据层在 IN_RANGE 模式下也跟随，
 * 上下预备让滚动跨页时无缝衔接（数据已在相邻面板预备好）。
 *
 * Math.max(1, ...) 兜底：clientHeight 未初始化（=0）时至少 1 个面板 × 3 = 3。
 */
const panelCount = computed(() => {
  const ch = Math.max(clientHeight.value, 1)
  const visiblePerPageBlock = Math.max(1, Math.ceil(ch / pageBlockHeight.value))
  return visiblePerPageBlock * 3
})

const pageSizeOptions = [
  { label: '20 条/页', value: 20 },
  { label: '50 条/页', value: 50 },
  { label: '100 条/页', value: 100 },
]

// ==================== vxe-grid 配置 ====================

const gridOptions: VxeGridProps<MeetHr> = {
  keepSource: true, // revertData 撤销编辑需要
  border: true,
  stripe: true,
  // 必须禁用虚拟滚动：vxe-grid 默认 gt=60，pageSize=100 时会启用 transform 模式，
  // body-wrapper overflow:hidden + transform 移动 table，与外部 scroll-shell 滚动冲突。
  // 每页 ≤ 100 行全量渲染，禁用虚拟滚动让滚动行为单一来源（scroll-shell）。
  virtualYConfig: { enabled: false, gt: 99999 },
  editConfig: { trigger: 'dblclick', mode: 'row', showStatus: true },
  rowConfig: { keyField: 'id', isHover: true },
  columnConfig: { resizable: true },
  toolbarConfig: { enabled: false },
  // 不传 seqConfig.startIndex：每页内部行号从 1 开始，用户看「第 X 页」分割条知道页号
  columns: buildMeetHrColumns(),
}

// ==================== 面板 pageIdx 计算 ====================

/**
 * 计算 panelCount 个面板应该显示的 pageIdx 数组。
 *
 * 策略：让 firstVisiblePageIdx 处于面板数组中间偏前位置——
 * 前面有 visiblePerPageBlock 个预备（覆盖刚滚出视口的页），
 * 后面有 visiblePerPageBlock 个预备（覆盖即将进入视口的页）。
 *
 * 边界 clamp：
 * - start < 0 时归 0（视口在头部时，预备被压缩到一边）
 * - start > maxStart 时归 maxStart（视口在尾部时同理）
 * - maxStart = max(0, total - panelCount)，避免面板数组末尾越过 totalPages
 *
 * 末尾若总页数 < panelCount，pageIdx 仍按 0,1,2,... 顺序排（可能 > total-1），
 * buildPageData 会返回 EMPTY_ROWS，面板永远活着不卸载。
 */
function computePanelPageIdxs(): number[] {
  const tp = totalPages.value
  const pc = panelCount.value
  if (tp === 0 || pc === 0) return []

  const visiblePerPageBlock = Math.max(1, Math.ceil(clientHeight.value / pageBlockHeight.value))
  const startOffset = visiblePerPageBlock
  let start = firstVisiblePageIdx.value - startOffset
  if (start < 0) start = 0
  const maxStart = Math.max(0, tp - pc)
  if (start > maxStart) start = maxStart

  const arr: number[] = []
  for (let i = 0; i < pc; i++) {
    arr.push(start + i)
  }
  return arr
}

// ==================== 数据构造（memoize）====================

/**
 * 构造某页的行数组：行齐全返回数组，缺行返回 EMPTY_ROWS。
 *
 * memoize 关键：vxe-grid 看到 :data 引用变化会重跑 calcCellHeight / calcScrollbar（强制 reflow）。
 * 用浅比较命中旧引用可让 vxe-grid 直接跳过整页重渲染。
 *
 * rowCache 里的行对象引用稳定（mockGetMeetHrPage 返回同源对象），浅比较是 O(1) per row。
 */
function buildPageData(pageIdx: number): MeetHr[] {
  const tp = totalPages.value
  if (pageIdx < 0 || pageIdx >= tp) return EMPTY_ROWS

  const ps = pageSize.value
  const start = pageIdx * ps
  const end = Math.min(start + ps, total.value)

  const rows: MeetHr[] = []
  for (let i = start; i < end; i++) {
    const row = rowCache.get(i)
    // 缺行用 EMPTY_ROWS 兜底（让面板显示空，但 grid 实例不卸载）
    if (row === void 0) return EMPTY_ROWS
    rows.push(row)
  }

  const memoized = pageDataMemo.get(pageIdx)
  if (
    memoized !== void 0 &&
    memoized.length === rows.length &&
    memoized.every((row, i) => row === rows[i])
  ) {
    return memoized
  }

  pageDataMemo.set(pageIdx, rows)
  return rows
}

// ==================== 滚动模式判定 ====================

/**
 * 判断滚动模式：检查可见面板对应的页是否都在 cachedPageSet 中。
 *
 * 设计缘由：用缓存覆盖范围而非速度判定，更准确反映「数据是否就绪」。
 * - 速度判定有误判：用户快速滚回时数据已在缓存，速度虽快但应该 IN_RANGE 即时跟踪
 * - 缓存覆盖判定精确：只要数据在缓存，无论滚动多快都应即时响应
 */
function getScrollMode(): 'IN_RANGE' | 'OUT_OF_RANGE' {
  const tp = totalPages.value
  for (const idx of computePanelPageIdxs()) {
    // 只检查 [0, totalPages) 范围内的页（越界页是 EMPTY_ROWS，不影响模式）
    if (idx >= 0 && idx < tp && !cachedPageSet.has(idx)) {
      return 'OUT_OF_RANGE'
    }
  }
  return 'IN_RANGE'
}

// ==================== 面板更新 ====================

/** 立即更新骨架层（始终在 onScroll 中调用，无脑跟踪） */
function updateSkeletonPanels(): void {
  const idxs = computePanelPageIdxs()
  // 用 map 而非 Array.from + push：编码规范避免展开语法，这里 map 直接生成
  skeletonPanels.value = idxs.map((pageIdx, panelId) => ({ panelId, pageIdx }))
}

/** 立即更新数据层（IN_RANGE 模式用，原子切换 pageIdx + transform + data） */
function updateDataPanels(): void {
  const idxs = computePanelPageIdxs()
  dataPanels.value = idxs.map((pageIdx, panelId) => ({
    panelId,
    pageIdx,
    data: buildPageData(pageIdx),
  }))
}

// ==================== OUT_OF_RANGE 节流刷新 ====================

let outOfRangeTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 调度 OUT_OF_RANGE 刷新：300ms 后执行一次。
 * 已调度时不重复（让连续滚动期间至少每 300ms 刷新一次，不无限推迟）。
 */
function scheduleOutOfRangeRefresh(): void {
  if (outOfRangeTimer !== null) return
  outOfRangeTimer = setTimeout(() => {
    outOfRangeTimer = null
    refreshAfterScroll()
  }, OUT_OF_RANGE_REFRESH_INTERVAL_MS)
}

/** 滚动后刷新：更新数据层 + 触发懒加载 + 预取下方页 */
function refreshAfterScroll(): void {
  updateDataPanels()
  const idxs = computePanelPageIdxs()
  void ensurePagesLoaded(idxs)

  // 预取下方 PRELOAD_AHEAD 页：让用户滚到下方时数据提前就位
  if (idxs.length > 0) {
    const lastIdx = idxs[idxs.length - 1]
    if (lastIdx !== void 0) {
      const preload: number[] = []
      for (let i = 1; i <= PRELOAD_AHEAD; i++) {
        const idx = lastIdx + i
        if (idx < totalPages.value) preload.push(idx)
      }
      if (preload.length > 0) void ensurePagesLoaded(preload)
    }
  }
}

// ==================== 滚动 handler ====================

const onScroll = useThrottleFn((e: Event) => {
  // 编辑中锁滚动：editingPageIdx !== null 表示有 grid 在编辑或有未保存变更
  if (editingPageIdx.value !== null) return
  const target = e.target as HTMLElement
  scrollTop.value = target.scrollTop

  // 骨架层始终立即更新（闪电响应）
  updateSkeletonPanels()

  // 数据层根据模式：
  // - IN_RANGE：即时跟踪（每个滚动事件都更新）
  // - OUT_OF_RANGE：调度节流刷新（300ms 内的连续滚动只刷新一次）
  const mode = getScrollMode()
  if (mode === 'IN_RANGE') {
    updateDataPanels()
  } else {
    scheduleOutOfRangeRefresh()
  }
}, 16)

// ==================== 懒加载 ====================

/**
 * 确保给定页号列表的行都已进 rowCache，缺页并发拉取。
 *
 * 与 InfinitePagesImpl 的差异：
 * - 用 cachedPageSet.has(idx) 判定是否已缓存（O(1)），而非 isPageComplete 逐行查
 * - cachedPageSet 在拉取完成后 add(idx)，下次 ensurePagesLoaded 直接命中
 * - rowCache 用 Map（非 reactive），不触发响应式追踪
 * - 拉取完成后调 updateDataPanels 让数据层显示新加载的页
 */
async function ensurePagesLoaded(indices: readonly number[]): Promise<void> {
  const tp = totalPages.value
  const needLoad = indices.filter(
    (idx) => idx >= 0 && idx < tp && !cachedPageSet.has(idx) && !loadingPages.has(idx)
  )
  if (needLoad.length === 0) return

  needLoad.forEach((idx) => loadingPages.add(idx))

  try {
    const settled = await Promise.allSettled(
      needLoad.map((idx) => mockGetMeetHrPage(idx + 1, pageSize.value))
    )
    const ps = pageSize.value
    settled.forEach((res, i) => {
      const idx = needLoad[i]
      if (idx === void 0) return
      if (res.status === 'fulfilled') {
        const start = idx * ps
        res.value.data.forEach((row, j) => rowCache.set(start + j, row))
        cachedPageSet.add(idx)
      }
      // rejected：cachedPageSet 不 add，下次 ensurePagesLoaded 重试
    })

    // LRU 驱逐：缓存页数超限时，驱逐距离视口最远的页
    evictDistantPages()

    // 数据加载完成，刷新数据层显示
    updateDataPanels()
  } finally {
    needLoad.forEach((idx) => loadingPages.delete(idx))
  }
}

/**
 * LRU 驱逐：当 cachedPageSet.size > MAX_CACHED_PAGES 时，驱逐距离 firstVisiblePageIdx 最远的页。
 *
 * 设计缘由：无限数据场景下内存有限，必须舍弃「离用户最远」的老数据。
 * 「最远」按 |pageIdx - firstVisiblePageIdx| 度量，简单的距离度量足够实用。
 *
 * 驱逐时同步删除：
 * - cachedPageSet 中的页号
 * - rowCache 中该页对应的所有行（pageSize 行）
 * - pageDataMemo 中的 memo（避免数据已被驱逐但 memo 仍指向旧数组）
 */
function evictDistantPages(): void {
  if (cachedPageSet.size <= MAX_CACHED_PAGES) return

  // 计算每个缓存页距视口的距离，远的在前
  const distances = Array.from(cachedPageSet).map((idx) => ({
    idx,
    distance: Math.abs(idx - firstVisiblePageIdx.value),
  }))
  distances.sort((a, b) => b.distance - a.distance)

  const evictCount = cachedPageSet.size - MAX_CACHED_PAGES
  const ps = pageSize.value
  for (let i = 0; i < evictCount; i++) {
    const item = distances[i]
    if (item === void 0) continue
    const { idx } = item
    cachedPageSet.delete(idx)
    // 删除该页对应的所有行
    const start = idx * ps
    const end = start + ps
    for (let r = start; r < end; r++) {
      rowCache.delete(r)
    }
    // 清掉 memo（旧数组引用失效，避免下次命中已驱逐的数据）
    pageDataMemo.delete(idx)
  }
}

// ==================== DataPanel 实例收集 ====================

/**
 * 函数 ref：DataPanel 挂载时收集实例，卸载时移除。
 * 用 Map 而非数组：panelId 是稳定的，Map 查找 O(1)。
 */
function setDataPanelRef(panelId: number, el: Element | DataPanelInstance | null): void {
  if (el) {
    dataPanelInstances.set(panelId, el as DataPanelInstance)
  } else {
    dataPanelInstances.delete(panelId)
  }
}

/** 通过 pageIdx 找到对应 grid 实例（CRUD 用） */
function getGridByPageIdx(pageIdx: number): VxeGridInstance | undefined {
  const panel = dataPanels.value.find((p) => p.pageIdx === pageIdx)
  if (!panel) return void 0
  return dataPanelInstances.get(panel.panelId)?.getGrid()
}

// ==================== 跳页 ====================

function jumpToPage(): void {
  if (editingPageIdx.value !== null) return
  const target = clamp(jumpTarget.value, 1, Math.max(totalPages.value, 1))
  jumpTarget.value = target
  if (scrollShellEl.value) {
    scrollShellEl.value.scrollTop = (target - 1) * pageBlockHeight.value
  }
}

function prevPage(): void {
  if (editingPageIdx.value !== null) return
  if (currentVisiblePage.value <= 1) return
  jumpTarget.value = currentVisiblePage.value - 1
  if (scrollShellEl.value) {
    scrollShellEl.value.scrollTop = (jumpTarget.value - 1) * pageBlockHeight.value
  }
}

function nextPage(): void {
  if (editingPageIdx.value !== null) return
  if (currentVisiblePage.value >= totalPages.value) return
  jumpTarget.value = currentVisiblePage.value + 1
  if (scrollShellEl.value) {
    scrollShellEl.value.scrollTop = (jumpTarget.value - 1) * pageBlockHeight.value
  }
}

// ==================== CRUD ====================

/**
 * 新增：默认插入到 firstVisiblePageIdx（用户当前看的页）。
 * 已在编辑某页时连续插入到同一页（保留编辑上下文）。
 */
async function handleInsert(): Promise<void> {
  if (total.value === 0) return
  const idx = editingPageIdx.value ?? firstVisiblePageIdx.value
  const grid = getGridByPageIdx(idx)
  if (!grid) return
  editingPageIdx.value = idx
  const { row } = await grid.insert(createEmptyMeetHr())
  await grid.setEditRow(row)
}

function onEditActived(pageIdx: number): void {
  editingPageIdx.value = pageIdx
  isEditing.value = true
}

function onEditClosed(): void {
  isEditing.value = false
  // 不清 editingPageIdx：用户可能继续编辑别的 cell，或准备点保存/取消。
  // editingPageIdx 只在 handleSave/handleDelete/handleCancel 时清空
}

/**
 * 保存：遍历所有数据面板的 grid 收集 insertRecords/updateRecords，调对应 API。
 * 理论上只有 editingPageIdx 的 grid 有变更，但全遍历更保险。
 */
async function handleSave(): Promise<void> {
  const tasks: Promise<unknown>[] = []
  for (const panel of dataPanels.value) {
    const grid = dataPanelInstances.get(panel.panelId)?.getGrid()
    if (!grid) continue
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

/** 删除：遍历所有数据面板的 grid 收集 checkbox 选中的行 */
async function handleDelete(): Promise<void> {
  const tasks: Promise<unknown>[] = []
  for (const panel of dataPanels.value) {
    const grid = dataPanelInstances.get(panel.panelId)?.getGrid()
    if (!grid) continue
    const selectRecords = grid.getCheckboxRecords()
    for (const record of selectRecords as MeetHr[]) {
      // 临时负 id（前端未保存的新增行）跳过
      if (record.id && record.id > 0) {
        tasks.push(mockDeleteMeetHr(record.id))
      }
    }
  }
  if (tasks.length > 0) await Promise.all(tasks)
  await onAfterMutation()
}

/**
 * 取消编辑：先 clearEdit 让 in-flight 编辑值 commit 到 updateRecords，
 * 再 getRecordset 读完整变更并撤销。
 *
 * 顺序很关键：先 getRecordset 再 clearEdit 会漏掉正在编辑的值
 * （clearEdit 反而把它 commit 进 updateRecords，但还原已过）。
 */
async function handleCancel(): Promise<void> {
  for (const panel of dataPanels.value) {
    const grid = dataPanelInstances.get(panel.panelId)?.getGrid()
    if (!grid) continue
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
 * 增删改后回调：清空所有缓存，重新拉 total 和当前可见范围。
 *
 * 设计缘由：CRUD 让数据顺序/内容变化，旧缓存的行都对应错误的页。
 * 全部清空 → cachedPageSet 清空 → getScrollMode 必返回 OUT_OF_RANGE →
 * 数据层冻结 → 骨架层接管显示 → ensurePagesLoaded 重新拉取 → 数据层刷新
 */
async function onAfterMutation(): Promise<void> {
  rowCache.clear()
  cachedPageSet.clear()
  pageDataMemo.clear()

  total.value = await mockGetMeetHrCount()
  editingPageIdx.value = null
  isEditing.value = false

  // 等 nextTick 让 totalPages / spacerHeight 等派生重算
  await nextTick()

  // 骨架层立即更新（让用户看到「正在重新加载」的骨架）
  updateSkeletonPanels()

  // 数据层暂不更新（让其停留在旧位置，等 ensurePagesLoaded 内部 updateDataPanels 刷新）
  // 但 dataPanels 的旧 pageIdx 可能越界（totalPages 变了），主动清空让面板消失或显示空
  updateDataPanels()

  // 拉取当前可见范围
  await ensurePagesLoaded(computePanelPageIdxs())
}

// ESC 键取消编辑：编辑态按 Esc 触发 handleCancel
useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape' && editingPageIdx.value !== null) {
    void handleCancel()
  }
})

// ==================== 客户端尺寸监听 ====================

useResizeObserver(scrollShellEl, (entries) => {
  const rect = entries[0]?.contentRect
  if (rect) {
    const oldPanelCount = panelCount.value
    clientHeight.value = rect.height
    // panelCount 变化时重新初始化所有面板（避免新面板 pageIdx 未设置）
    if (panelCount.value !== oldPanelCount) {
      updateSkeletonPanels()
      updateDataPanels()
    }
  }
})

// ==================== pageSize 变化 ====================

watch(pageSize, (newSize, oldSize) => {
  if (editingPageIdx.value !== null) return

  // pageSize 变化 → cachedPageSet 完全失效（页号重切），但 rowCache 保留（按全局行号）
  // 重新扫描 rowCache 按新 pageSize 计算哪些页"完整缓存"
  recomputeCachedPageSet()
  pageDataMemo.clear()

  // 计算新 scrollTop：保持视口顶端看到的还是原来那行（参考 InfinitePagesImpl 的算法）
  const headerOverhead = DIVIDER_HEIGHT + HEADER_HEIGHT
  const oldPageBlockH = headerOverhead + oldSize * ROW_HEIGHT
  const oldPageIdx = Math.floor(scrollTop.value / oldPageBlockH)
  const oldPageOffset = scrollTop.value - oldPageIdx * oldPageBlockH

  // 特例：视口顶在第 0 页的 overhead 区域（分割条/表头）——两种布局下 spacer 顶端都对齐
  if (oldPageIdx === 0 && oldPageOffset < headerOverhead) {
    void nextTick(() => {
      if (scrollShellEl.value) scrollShellEl.value.scrollTop = scrollTop.value
    })
    return
  }

  const intraRowPixel = oldPageOffset - headerOverhead
  let globalRow: number
  let pixelIntoRow: number
  if (intraRowPixel < 0) {
    globalRow = oldPageIdx * oldSize
    pixelIntoRow = 0
  } else {
    globalRow = oldPageIdx * oldSize + Math.floor(intraRowPixel / ROW_HEIGHT)
    pixelIntoRow = intraRowPixel % ROW_HEIGHT
  }

  if (globalRow >= total.value) {
    globalRow = Math.max(0, total.value - 1)
    pixelIntoRow = 0
  }

  const newPageIdx = Math.floor(globalRow / newSize)
  const newRowInPage = globalRow - newPageIdx * newSize
  const newScrollTop =
    newPageIdx * pageBlockHeight.value + headerOverhead + newRowInPage * ROW_HEIGHT + pixelIntoRow

  scrollTop.value = newScrollTop
  jumpTarget.value = newPageIdx + 1
  void nextTick(() => {
    if (scrollShellEl.value) scrollShellEl.value.scrollTop = newScrollTop
    // 切换后立即重新初始化面板（pageBlockHeight 变化）
    updateSkeletonPanels()
    updateDataPanels()
  })
})

/**
 * 重新计算 cachedPageSet：按新 pageSize 扫描 rowCache，把"行齐全"的页号加入。
 *
 * 设计缘由：pageSize 变化时页号完全重切，cachedPageSet 失效，但 rowCache 按
 * 全局行号索引仍有效。扫描一次让"恰好拼齐"的页继续命中，避免重复请求。
 *
 * O(total) 扫描，只在 pageSize 变化时执行（用户操作不频繁），可接受。
 */
function recomputeCachedPageSet(): void {
  cachedPageSet.clear()
  const ps = pageSize.value
  const tp = totalPages.value
  const t = total.value
  for (let pageIdx = 0; pageIdx < tp; pageIdx++) {
    const start = pageIdx * ps
    const end = Math.min(start + ps, t)
    let complete = true
    for (let i = start; i < end; i++) {
      if (!rowCache.has(i)) {
        complete = false
        break
      }
    }
    if (complete) cachedPageSet.add(pageIdx)
  }
}

// ==================== 生命周期 ====================

onMounted(async () => {
  total.value = await mockGetMeetHrCount()
  await nextTick()
  // 等 ResizeObserver 第一次回调把 clientHeight 设上
  await nextTick()

  // 初始化面板 + 触发懒加载
  updateSkeletonPanels()
  updateDataPanels()
  await ensurePagesLoaded(computePanelPageIdxs())
})

// ==================== 调试接口（挂 window，方便 DevTools 验证）====================

interface InfiniteTransformTrickDebug {
  readonly total: number
  readonly pageSize: number
  readonly totalPages: number
  readonly pageBlockHeight: number
  readonly spacerHeight: number
  readonly scrollTop: number
  readonly clientHeight: number
  readonly firstVisiblePageIdx: number
  readonly panelCount: number
  readonly cachedPageCount: number
  readonly cachedPages: readonly number[]
  readonly loadingPages: readonly number[]
  readonly rowCacheSize: number
  readonly skeletonPanels: ReadonlyArray<{ panelId: number; pageIdx: number }>
  readonly dataPanels: ReadonlyArray<{ panelId: number; pageIdx: number; rowCount: number }>
  readonly scrollMode: 'IN_RANGE' | 'OUT_OF_RANGE'
  scrollToPage: (pageIdx1Based: number) => void
}
declare global {
  interface Window {
    __infiniteTransformTrickDebug?: InfiniteTransformTrickDebug
  }
}
if (window !== void 0) {
  window.__infiniteTransformTrickDebug = {
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
    get panelCount() {
      return panelCount.value
    },
    get cachedPageCount() {
      return cachedPageSet.size
    },
    get cachedPages() {
      return Array.from(cachedPageSet).sort((a, b) => a - b)
    },
    get loadingPages() {
      return Array.from(loadingPages)
    },
    get rowCacheSize() {
      return rowCache.size
    },
    get skeletonPanels() {
      return skeletonPanels.value
    },
    get dataPanels() {
      return dataPanels.value.map((p) => ({ ...p, rowCount: p.data.length }))
    },
    get scrollMode() {
      return getScrollMode()
    },
    scrollToPage: (pageIdx1Based: number) => {
      if (scrollShellEl.value) {
        scrollShellEl.value.scrollTop = (pageIdx1Based - 1) * pageBlockHeight.value
      }
    },
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
        共 {{ total }} 条 · 已缓存 {{ cachedPageSet.size }} 页 · 面板 {{ panelCount }} · scrollTop
        {{ Math.round(scrollTop) }}px<template v-if="editingPageIdx !== null">
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
        <div :class="$style.spacer" :style="{ height: spacerHeight + 'px' }">
          <!-- 骨架层（z-index 1）：始终即时响应用户滚动，提供「闪电响应」 -->
          <SkeletonPanel
            v-for="panel in skeletonPanels"
            :key="`s-${panel.panelId}`"
            :panel-id="panel.panelId"
            :page-idx="panel.pageIdx"
            :page-block-height="pageBlockHeight"
            :divider-height="DIVIDER_HEIGHT"
            :header-height="HEADER_HEIGHT"
            :row-height="ROW_HEIGHT"
            :page-size="pageSize"
          />
          <!-- 数据层（z-index 2）：vxe-grid 实例固定不变，按滚动模式策略性更新 -->
          <DataPanel
            v-for="panel in dataPanels"
            :key="`d-${panel.panelId}`"
            :ref="(el) => setDataPanelRef(panel.panelId, el)"
            :panel-id="panel.panelId"
            :page-idx="panel.pageIdx"
            :page-block-height="pageBlockHeight"
            :divider-height="DIVIDER_HEIGHT"
            :grid-options="gridOptions"
            :data="panel.data"
            @edit-actived="onEditActived"
            @edit-closed="onEditClosed"
          />
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

.scrollLocked {
  overflow: hidden !important;
}

.spacer {
  position: relative;
  width: 100%;
}

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

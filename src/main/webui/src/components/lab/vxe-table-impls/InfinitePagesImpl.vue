<script setup lang="ts">
import type { VxeGridProps } from 'vxe-table'

import { useResizeObserver, useThrottleFn } from '@vueuse/core'
import { NInputNumber, NSelect } from 'naive-ui'
import { computed, nextTick, onMounted, ref, watch } from 'vue'

import type { MeetHr } from '@/model/web/api/meet-hr'

import { mockGetMeetHrCount, mockGetMeetHrPage } from './mock-data'
import { buildMeetHrColumns, clamp, ROW_HEIGHT } from './shared'

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
 * 与其他实现的核心差异：
 *   - InfiniteWindowImpl：单 grid + 50 行窗口 + 自写 sticky header（DOM 最少，但跨页对比难）
 *   - InfiniteContextImpl：单 grid + 3 页 context（滚动条会跳，但 DOM 节点省）
 *   - 本实现：多 grid 串联，每页独立 header + 分页分隔条（DOM 最多，但分页语义最清晰，
 *     用户能直观看到"现在看的是第几页"，跳页/对比方便）
 *
 * 代价：pageSize 大时 DOM 节点多（每页 ~pageSize 行 + 1 header + 1 divider），
 * 但因为只有可见 ±1 页被渲染，DOM 总数 = ~(2-3) × pageSize，pageSize=50 时约 150 行，可控。
 *
 * 注：本实现聚焦"多页 ListView"演示，不接 CRUD（多 grid 的编辑态追踪复杂，留给其他实现演示）。
 */

// ==================== 常量 ====================

/** 页分割条高度（实心蓝底白字）。比 ROW_HEIGHT 略小，与数据行视觉上区分。 */
const DIVIDER_HEIGHT = 40
/** vxe-grid 表头高度（vxe-table 默认行高）。与 ROW_HEIGHT 一致。 */
const HEADER_HEIGHT = 48
/** 双层缓冲页数：渲染可视页 ± BUFFER_PAGES。1 表示上下各预渲染 1 页。 */
const BUFFER_PAGES = 1

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
/** 页数据缓存：pageIdx(0-based) → 行数组。
 *  用 reactive Map（不是普通 Map），新建 Map 触发 vxe-grid 的 :data 重新求值。 */
const pageCache = ref<Map<number, MeetHr[]>>(new Map())
/** 正在加载的页索引集合。避免 watch 在 Promise resolve 前重复触发同一页的请求。 */
const loadingPages = ref<Set<number>>(new Set())

/** 跳页输入框绑定值（1-based） */
const jumpTarget = ref(1)

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
  rowConfig: { keyField: 'id', isHover: true },
  columnConfig: { resizable: true },
  toolbarConfig: { enabled: false },
  // 不传 seqConfig.startIndex：每页内部行号从 1 开始（vxe-grid 默认）。
  // 用户看「第 X 页」分割条就知道页号，行号是页内位置，从 1 开始符合直觉。
  columns: buildMeetHrColumns(),
}

// ==================== 懒加载 ====================

/** 确保给定页码列表都已加载到 pageCache，缺失的并发拉取。
 *  - 用 loadingPages Set 防并发：watch 可能在 Promise resolve 前再次触发
 *  - 用 new Map 替换 pageCache.value 触发 reactive，让 vxe-grid 的 :data 重算 */
async function ensurePagesLoaded(indices: readonly number[]) {
  const needLoad = indices.filter((idx) => !pageCache.value.has(idx) && !loadingPages.value.has(idx))
  if (needLoad.length === 0) return

  const newLoading = new Set(loadingPages.value)
  needLoad.forEach((idx) => newLoading.add(idx))
  loadingPages.value = newLoading

  try {
    // 并发拉取所有缺失页（mock 数据 cheap，~50ms；真实后端可加 hashMap 缓存避免重复请求）
    const results = await Promise.all(needLoad.map((idx) => mockGetMeetHrPage(idx + 1, pageSize.value)))
    const newCache = new Map(pageCache.value)
    results.forEach((result, i) => {
      newCache.set(needLoad[i], result.data)
    })
    pageCache.value = newCache
  } finally {
    const cleared = new Set(loadingPages.value)
    needLoad.forEach((idx) => cleared.delete(idx))
    loadingPages.value = cleared
  }
}

// ==================== 滚动 handler ====================

const onScroll = useThrottleFn((e: Event) => {
  const target = e.target as HTMLElement
  scrollTop.value = target.scrollTop
}, 16)

// ==================== 跳页 ====================

function jumpToPage() {
  const target = clamp(jumpTarget.value, 1, Math.max(totalPages.value, 1))
  jumpTarget.value = target
  // 直接赋值 scrollTop（同步、瞬间），会触发 scroll 事件 → onScroll → renderedPageIndices 重算
  if (scrollShellEl.value) {
    scrollShellEl.value.scrollTop = (target - 1) * pageBlockHeight.value
  }
}

// ==================== 客户端尺寸监听 ====================

// 用 ResizeObserver：窗口 resize / 父容器 flex 变化时 clientHeight 会变，
// 影响 lastVisiblePageIdx 计算。监听后 clientHeight 持续准确。
useResizeObserver(scrollShellEl, (entries) => {
  const rect = entries[0]?.contentRect
  if (rect) clientHeight.value = rect.height
})

// ==================== pageSize 变化 ====================

watch(pageSize, () => {
  // pageSize 变化 → 所有缓存的页数据失效（每页行数不同了）→ 清缓存 + 回顶
  pageCache.value = new Map()
  scrollTop.value = 0
  jumpTarget.value = 1
  if (scrollShellEl.value) scrollShellEl.value.scrollTop = 0
})

// ==================== renderedPageIndices 变化时触发懒加载 ====================

watch(renderedPageIndices, (indices) => {
  void ensurePagesLoaded(indices)
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
  readonly cachedPageCount: number
  readonly loadingPages: readonly number[]
  readonly currentVisiblePage: number
  scrollToPage: (pageIdx1Based: number) => void
  getPageData: (pageIdx0Based: number) => MeetHr[] | undefined
}
declare global {
  interface Window {
    __infinitePagesDebug?: InfinitePagesDebug
  }
}
if (typeof window !== 'undefined') {
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
    get cachedPageCount() {
      return pageCache.value.size
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
    getPageData: (pageIdx0Based: number) => pageCache.value.get(pageIdx0Based),
  }
}
</script>

<template>
  <div :class="$style.root">
    <div :class="$style.toolbar">
      <label :class="$style.fieldLabel">
        分页大小
        <NSelect
          v-model:value="pageSize"
          :options="pageSizeOptions"
          size="small"
          :class="$style.pageSizeSelect"
        />
      </label>
      <label :class="$style.fieldLabel">
        跳转到第
        <NInputNumber
          v-model:value="jumpTarget"
          size="small"
          :min="1"
          :max="Math.max(totalPages, 1)"
          :class="$style.jumpInput"
          @keyup.enter="jumpToPage"
        />
        页
        <button type="button" :class="$style.jumpBtn" @click="jumpToPage">Go</button>
      </label>
      <span :class="$style.status">
        当前第 {{ currentVisiblePage }} / {{ totalPages }} 页 · 共 {{ total }} 条 · 已缓存
        {{ pageCache.size }} 页 · 渲染 {{ renderedPageIndices.length }} 页 · scrollTop
        {{ Math.round(scrollTop) }}px
      </span>
    </div>
    <div ref="scrollShellEl" :class="$style.scrollShell" @scroll.passive="onScroll">
      <div :class="$style.spacer" :style="{ height: spacerHeight + 'px' }">
        <div
          v-for="pageIdx in renderedPageIndices"
          :key="pageIdx"
          :class="$style.pageBlock"
          :style="{ top: pageIdx * pageBlockHeight + 'px', height: pageBlockHeight + 'px' }"
        >
          <div :class="$style.pageDivider">
            <span :class="$style.pageDividerText">第 {{ pageIdx + 1 }} 页</span>
          </div>
          <div :class="$style.gridWrapper">
            <vxe-grid v-bind="gridOptions" height="100%" :data="pageCache.get(pageIdx) ?? []" />
          </div>
        </div>
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

.toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.fieldLabel {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #555;
}

.pageSizeSelect {
  width: 110px;
}

.jumpInput {
  width: 90px;
}

.jumpBtn {
  padding: 4px 14px;
  border-radius: 4px;
  border: 1px solid #409eff;
  background-color: #409eff;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
}

.jumpBtn:hover {
  background-color: #66b1ff;
  border-color: #66b1ff;
}

.status {
  margin-left: auto;
  font-size: 12px;
  color: #888;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.scrollShell {
  flex: 1;
  min-height: 0;
  overflow: auto;
  position: relative;
  box-sizing: border-box;
  border: 1px solid #e8e8e8;
}

.spacer {
  position: relative;
  width: 100%;
}

.pageBlock {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
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
</style>

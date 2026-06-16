<script setup lang="ts">
import type { VxeGridInstance, VxeGridListeners, VxeGridProps } from 'vxe-table'

import { useResizeObserver, useThrottleFn } from '@vueuse/core'
import { NSelect } from 'naive-ui'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

import type { MeetHr } from '@/model/web/api/meet-hr'

import CrudToolbar from './CrudToolbar.vue'
import {
  mockAddMeetHr,
  mockDeleteMeetHr,
  mockGetMeetHrCount,
  mockGetMeetHrPage,
  mockUpdateMeetHr,
} from './mock-data'
import { buildMeetHrColumns, ROW_HEIGHT } from './shared'
import { useVxeGridCrud } from './useVxeGridCrud'

/**
 * 上下文窗口版：完全用 vxe-grid 自带能力（固定表头 + scrollBoundary + virtualYConfig），
 * 不碰自定义滚动壳。核心思路是「固定长度 context（3 页）」：
 *
 *   context (vxe-grid 的 data，恒长 3 × pageSize 行，边界时少 1 页)
 *     [ prev buffer (page N-1) | current page (page N) | next buffer (page N+1) ]
 *
 * 用户滚到 next buffer 末尾触发换页（advanceForward）：
 *   1. 记录视区第一行的 _globalSeq
 *   2. currentPage++ (N → N+1)
 *   3. 重新构建 context = [page N, page N+1, page N+2]（并行拉 3 页）
 *   4. 在新 context 中找到同一 _globalSeq，scrollTo 到它的位置
 *
 * 关键约束：视区内容在换页前后保持不变（用户看到的全局行号不变），只是 context 数据替换
 * + 滚动条位置跳变。这样用户视觉上"内容不动，只有滚动条在跳"，可以无缝继续往下滚看 page N+2。
 *
 * 反向（advanceBackward）对称。
 *
 * 换页时 context 数据完全替换，vxe-grid 的 data 数组始终 ≤ 3 × pageSize 行，不会无限增长，
 * 省下 JS 计算；代价是滚动条只反映 context 长度、换页瞬间会跳——但用户已确认可接受。
 *
 * 注：每次 advance 重新拉 3 页（mock 数据 cheap，~150ms）。生产环境可加 hashMap 缓存
 * 已加载的页避免重复请求，参考 InfiniteWindowImpl 的思路。
 *
 * 与 InfiniteWindowImpl（自定义滚动壳 + spacer 撑全局滚动条）相比：
 *   - 这版：表格上下文固定长度，滚动条上蹿下跳，但 vxe-grid 表头/编辑/虚拟滚动都用现成的
 *   - 那版：滚动条反映 total，跳滚精准，但需要手写 sticky header、scroll-shell、spacer
 */

const gridRef = ref<VxeGridInstance>()
/** vxe-grid 内部滚动容器（.vxe-table--scroll-y-handle），用于动态读取 clientHeight。
 *  vxe-grid 渲染后才有，HMR 或 v-show 切换时可能为 null，所有用到的地方都要兜底。 */
const scrollHandleEl = ref<HTMLElement>()
const clientHeight = ref(0)
// 用 ResizeObserver 监听：窗口 resize / 父容器 flex 变化时 clientHeight 会变，
// clientHeight 变化时 gridOptions 的 threshold 自动重算（computed 依赖 clientHeight）
useResizeObserver(scrollHandleEl, (entries) => {
  const rect = entries[0]?.contentRect
  if (rect) clientHeight.value = rect.height
})

const pageSize = ref(50)
const pageSizeOptions = [
  { label: '20 条/页', value: 20 },
  { label: '50 条/页', value: 50 },
  { label: '100 条/页', value: 100 },
]

const currentPage = ref(0)
const total = ref(0)
/** context 每行带 _globalSeq（1-based 全局行号），让 # 列跨换页连续显示 */
type ContextRow = MeetHr & { _globalSeq: number }
const context = ref<ContextRow[]>([])
const loading = ref(false)

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

/** 绑定 vxe-grid 渲染后的 scroll-y-handle 元素，触发 useResizeObserver */
function bindScrollHandleEl() {
  // nextTick 后 vxe-grid DOM 才存在
  void nextTick(() => {
    const el = gridRef.value?.$el?.querySelector('.vxe-table--scroll-y-handle') as HTMLElement | null
    if (el) {
      scrollHandleEl.value = el
      clientHeight.value = el.clientHeight // 立即同步初始值
    }
  })
}

onUnmounted(() => {
  scrollHandleEl.value = void 0
})

const gridOptions = computed<VxeGridProps<MeetHr>>(() => ({
  keepSource: true,
  border: true,
  stripe: true,
  // vxe-grid 自带固定表头：height 设值后 header 自动 sticky，body 内部滚动。
  // virtualYConfig.gt 设大数让虚拟滚动永不启用：vxe-grid 默认 gt=60，100 行 > 60
  // 就会启用 transform 模式（body-wrapper overflow:hidden，用 transform 移动 table
  // 而非 native scroll），导致 scrollBoundary 事件触发不了（dispatchEvent(scroll) 和
  // 真实滚轮都不行）。context 恒长 3 × pageSize（最多 300 行），不需要虚拟滚动。
  // 注：vxe-table 内部 virtualYConfig 优先于已废弃的 scrollY 字段。
  virtualYConfig: {
    enabled: false,
    gt: 99999,
    // threshold = pageSize * ROW_HEIGHT - clientHeight：让用户从初始位置（page N 开头）
    // 滚到 page N+1 开头时触发 scrollBoundary(bottom)，advance 把 context 推进到
    // [N+1, N+2, N+3]，预加载始终领先用户一页。
    // 推导：用户初始 scrollTop = pageSize * ROW_HEIGHT（见 loadInitialContext 的 scrollTo），
    // forward 触发点是 scrollTop = 2 * pageSize * ROW_HEIGHT（page N+1 开头）。
    // isBottomBoundary: scrollTop + clientHeight >= scrollHeight - threshold
    //   → 2*pageSize*ROW_HEIGHT + clientHeight >= 3*pageSize*ROW_HEIGHT - threshold
    //   → threshold >= pageSize*ROW_HEIGHT - clientHeight
    // clientHeight 动态取自 vxe-table 内部 .vxe-table--scroll-y-handle 元素
    // （useResizeObserver 监听，初始化/resize/切换 tab 都会更新）
    threshold: pageSize.value * ROW_HEIGHT - clientHeight.value,
  },
  editConfig: {
    trigger: 'dblclick',
    mode: 'row',
    showStatus: true,
  },
  rowConfig: {
    keyField: 'id',
    isHover: true,
  },
  columnConfig: {
    resizable: true,
  },
  toolbarConfig: {
    enabled: false,
  },
  columns: buildMeetHrColumns({ seqAsField: true }),
}))

async function loadPage(pageIdx: number): Promise<ContextRow[]> {
  if (pageIdx < 0 || pageIdx >= totalPages.value) return []
  const result = await mockGetMeetHrPage(pageIdx + 1, pageSize.value)
  // 给每行打 1-based 全局行号：page 0 第 0 行 = 1，page 0 第 49 行 = 50，page 1 第 0 行 = 51，…
  // context 滚动换页时，# 列要连续显示而不是每次从 1 重置。
  return result.data.map((row, i) => ({ ...row, _globalSeq: pageIdx * pageSize.value + i + 1 }))
}

/** 重新构建 context = [currentPage-1, currentPage, currentPage+1]，3 页并行拉。
 *  边界时（currentPage=0 或末页）相应那页为空数组，context 实际 1-2 页。 */
async function rebuildContext() {
  const [prev, curr, next] = await Promise.all([
    loadPage(currentPage.value - 1),
    loadPage(currentPage.value),
    loadPage(currentPage.value + 1),
  ])
  context.value = prev.concat(curr, next)
}

async function loadInitialContext() {
  total.value = await mockGetMeetHrCount()
  await rebuildContext()
  // 绑定 scroll-y-handle 元素（vxe-grid 已渲染），让 clientHeight / threshold 实时更新
  bindScrollHandleEl()
  // 初始定位到 current page 开头（context 中间页），让用户一进来就看到当前页内容，
  // 而不是 prev buffer。currentPage=0 边界时 prev buffer 不存在，scrollTop=0 就是 page 0 开头。
  await nextTick()
  const initialScrollTop = currentPage.value > 0 ? pageSize.value * ROW_HEIGHT : 0
  gridRef.value?.scrollTo(0, initialScrollTop)
}

// 用户滚到 next buffer 末尾 → 向前推进 1 页。
// 关键：advance 后视区内容保持不变（视区第一行的全局行号不变），只是 context 数据替换
// + 滚动条位置跳变（用户期望"滚动条上蹿下跳但内容不动"）。
// 实现：记录 advance 前视区第一行的 _globalSeq，advance 后在新 context 中找到同一行，
// scrollTo 到它的位置。这样用户看到的还是 page N+1 末尾，新 page N+2 在视区之下，
// 继续往下滚就能看到 page N+2 内容（到底再次触发 advance）。
async function advanceForward() {
  if (loading.value) return
  if (currentPage.value + 1 >= totalPages.value) return
  loading.value = true
  try {
    const oldScrollTop = gridRef.value?.getScroll().scrollTop ?? 0
    // 用 ceil 而不是 floor：scrollTop=1850 时 floor=38（部分被遮，只有底部 22px 可见），
    // 用户实际看到的"第一行"是 row 39（完全可见）。ceil(1850/48)=39 ✓。
    // 否则 advance 后视区第一行会比用户原本看到的位置少 1 行（"偏差一两行"的根源）。
    const oldFirstVisibleIdx = Math.ceil(oldScrollTop / ROW_HEIGHT)
    const oldFirstVisibleGlobalSeq = context.value[oldFirstVisibleIdx]?._globalSeq

    currentPage.value++
    await rebuildContext()

    // 在新 context 中定位同一全局行号，让视区内容保持不变。
    // fallback：原视区第一行不在新 context 时（用户没真实滚到边界就强制触发），
    // 简单跳到新 context 开头。加 threshold 后真实用户场景几乎不会进 fallback。
    const newFirstVisibleIdx = oldFirstVisibleGlobalSeq
      ? context.value.findIndex((r) => r._globalSeq === oldFirstVisibleGlobalSeq)
      : -1
    const newScrollTop = (newFirstVisibleIdx >= 0 ? newFirstVisibleIdx : 0) * ROW_HEIGHT

    await nextTick()
    await new Promise((r) => setTimeout(r, 50))
    gridRef.value?.scrollTo(0, newScrollTop)
    // loading 锁住节流窗口，防止 scrollTo 触发的 scroll 事件反向触发 advance
    await new Promise((r) => setTimeout(r, 600))
  } finally {
    loading.value = false
  }
}

// 用户滚到 prev buffer 开头 → 向后推进 1 页（对称）。
// 同样保持视区内容不变：用户原本看 page N-1 开头，advance 后新 context 中 page N-1 开头
// 位置变到中间，scrollTo 到那里，视区仍显示 page N-1 开头。用户继续往上滚看到 page N-2。
async function advanceBackward() {
  if (loading.value) return
  if (currentPage.value - 1 < 0) return
  loading.value = true
  try {
    const oldScrollTop = gridRef.value?.getScroll().scrollTop ?? 0
    // 用 ceil 同 advanceForward（理由见上）
    const oldFirstVisibleIdx = Math.ceil(oldScrollTop / ROW_HEIGHT)
    const oldFirstVisibleGlobalSeq = context.value[oldFirstVisibleIdx]?._globalSeq

    currentPage.value--
    await rebuildContext()

    let newFirstVisibleIdx = oldFirstVisibleGlobalSeq
      ? context.value.findIndex((r) => r._globalSeq === oldFirstVisibleGlobalSeq)
      : -1
    // fallback：原视区第一行不在新 context（page N+1 被推出 next buffer）时，
    // 定位到新 context 开头（page N-2 第 0 行），让用户看到上一页内容
    if (newFirstVisibleIdx < 0) {
      newFirstVisibleIdx = 0
    }
    const newScrollTop = newFirstVisibleIdx * ROW_HEIGHT

    await nextTick()
    await new Promise((r) => setTimeout(r, 50))
    gridRef.value?.scrollTo(0, newScrollTop)
    await new Promise((r) => setTimeout(r, 600))
  } finally {
    loading.value = false
  }
}

const scrollBoundary = useThrottleFn<Required<VxeGridListeners>['scrollBoundary']>((params) => {
  if (loading.value || isEditing.value) return
  if (params.direction === 'bottom') {
    void advanceForward()
  } else if (params.direction === 'top') {
    void advanceBackward()
  }
}, 500)
const gridEvents: VxeGridListeners = {
  scrollBoundary,
}

// 切换 pageSize：context 边界都变了，回 page 0 重新拉
watch(pageSize, () => {
  currentPage.value = 0
  context.value = []
  void loadInitialContext()
})

// CRUD 增删改后整个 context 失效，重新拉
async function onAfterMutation() {
  currentPage.value = 0
  context.value = []
  await loadInitialContext()
}

const { isEditing, handleInsert, handleSave, handleDelete, handleEditActived, handleEditClosed } =
  useVxeGridCrud(gridRef, {
    addFn: mockAddMeetHr,
    updateFn: mockUpdateMeetHr,
    deleteFn: mockDeleteMeetHr,
    onAfterMutation,
  })

onMounted(() => {
  void loadInitialContext()
})

// 调试用：把内部状态 + grid 实例挂到 window，便于在 DevTools 验证 context 滑动 + 触发换页
interface InfiniteContextDebug {
  readonly currentPage: number
  readonly total: number
  readonly pageSize: number
  readonly totalPages: number
  readonly contextLength: number
  scrollTo: (y: number) => void
  triggerScrollBoundary: (direction: 'top' | 'bottom') => Promise<void>
}
declare global {
  interface Window {
    __infiniteContextDebug?: InfiniteContextDebug
  }
}
if (typeof window !== 'undefined') {
  window.__infiniteContextDebug = {
    get currentPage() {
      return currentPage.value
    },
    get total() {
      return total.value
    },
    get pageSize() {
      return pageSize.value
    },
    get totalPages() {
      return totalPages.value
    },
    get contextLength() {
      return context.value.length
    },
    scrollTo: (y: number) => {
      gridRef.value?.scrollTo(0, y)
    },
    // 直接调换页函数（绕过 scrollBoundary 事件触发，方便测试），返回 promise 让外部 await
    triggerScrollBoundary: async (direction: 'top' | 'bottom') => {
      if (direction === 'bottom') await advanceForward()
      else await advanceBackward()
    },
  }
}
</script>

<template>
  <div :class="$style.root">
    <CrudToolbar @insert="handleInsert" @delete="handleDelete" @save="handleSave">
      <label :class="$style.pageSizeLabel">
        分页
        <NSelect
          v-model:value="pageSize"
          :options="pageSizeOptions"
          size="small"
          :class="$style.pageSizeSelect"
        />
      </label>
      <span :class="$style.status">
        当前页 {{ currentPage + 1 }} / 共 {{ totalPages }} 页 · 上下文 {{ context.length }} 行
      </span>
    </CrudToolbar>
    <div :class="$style.gridBox">
      <vxe-grid
        ref="gridRef"
        v-bind="gridOptions"
        height="100%"
        :data="context"
        @edit-actived="handleEditActived"
        @edit-closed="handleEditClosed"
        v-on="gridEvents"
      />
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

.pageSizeLabel {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #555;
}

.pageSizeSelect {
  width: 110px;
}

.status {
  margin-left: auto;
  font-size: 12px;
  color: #888;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.gridBox {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
}
</style>

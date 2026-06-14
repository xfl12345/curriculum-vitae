<script setup lang="ts">
import type { VxeGridInstance, VxeGridProps } from 'vxe-table'

import { useThrottleFn } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'

import type { MeetHr } from '@/model/web/api/meet-hr'

import CrudToolbar from './CrudToolbar.vue'
import {
  mockAddMeetHr,
  mockDeleteMeetHr,
  mockGetMeetHrCount,
  mockGetMeetHrPage,
  mockUpdateMeetHr,
} from './mock-data'
import {
  BUFFER,
  buildMeetHrColumns,
  clamp,
  FIXED_COLUMNS_TOTAL_WIDTH,
  FIXED_COLUMN_WIDTHS,
  PAGE_SIZE,
  ROW_HEIGHT,
  WINDOW_SIZE,
} from './shared'
import { useVxeGridCrud } from './useVxeGridCrud'

// ==================== 状态 ====================

const gridRef = ref<VxeGridInstance>()
const scrollShellRef = ref<HTMLElement>()

/** 全局索引 → 行（非响应式 Map，windowData computed 通过 windowStart 触发重算） */
const hashMap = new Map<number, MeetHr>()
/** 已加载范围上界（exclusive） */
const loadedMax = ref(0)
/** 总数（决定 spacer 高度，撑起全局滚动条） */
const total = ref(0)
/** 当前窗口起始全局索引 */
const windowStart = ref(0)
const loading = ref(false)
const scrollTopState = ref(0)

// ==================== 派生 ====================

const windowEnd = computed(() => Math.min(windowStart.value + WINDOW_SIZE, total.value))

const windowData = computed<(MeetHr & { _globalSeq: number })[]>(() => {
  // 显式依赖 loadedMax：hashMap 是普通 Map 不被 reactive 追踪，
  // 但每次加载完成 loadedMax 都会变化，借它强制 windowData 重算。
  void loadedMax.value
  const arr: (MeetHr & { _globalSeq: number })[] = []
  const end = windowEnd.value
  for (let i = windowStart.value; i < end; i++) {
    const row = hashMap.get(i)
    if (row) arr.push({ ...row, _globalSeq: i + 1 })
  }
  return arr
})

const spacerHeight = computed(() => total.value * ROW_HEIGHT)
const offsetY = computed(() => windowStart.value * ROW_HEIGHT)
const gridHeight = computed(() => Math.max(windowData.value.length * ROW_HEIGHT, ROW_HEIGHT))
const isWindowFullyLoaded = computed(() => windowData.value.length === windowEnd.value - windowStart.value)

// gridOptions 设计要点：
// - showHeader=false：vxe-grid 的表头会跟随 gridWrapper 一起被 absolute 带离视窗，
//   所以把表头手写到 scroll-shell 外面（stickyHeader），永远可见。
// - seqAsField=true：vxe-grid 内部缓存了 type='seq' 列的配置，windowStart 变化时
//   不会重新读取 seqConfig.startIndex，行号始终从 1 开始。改用普通字段 _globalSeq，
//   每条数据自带全局行号（见 windowData computed），随 data 切片自然刷新。
// - fixedLayout=true + columnConfig.resizable=false：所有列宽固定，让外面的 stickyHeader
//   能精确对齐 vxe-grid 列宽（FIXED_LAYOUT_WIDTHS 与 shared.ts 必须同步）。
const gridOptions = computed<VxeGridProps<MeetHr>>(() => ({
  keepSource: true,
  border: true,
  stripe: true,
  showHeader: false,
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
    resizable: false,
  },
  toolbarConfig: {
    enabled: false,
  },
  columns: buildMeetHrColumns({
    seqAsField: true,
    fixedLayout: true,
  }),
}))

// ==================== 懒加载 ====================

/** 根据 visibleStart 计算 windowStart 并赋值（clamp 到已加载范围内，避免空洞） */
function syncWindowStart(visibleStart: number) {
  const maxByLoaded = Math.max(0, loadedMax.value - WINDOW_SIZE + BUFFER)
  const maxByTotal = Math.max(0, total.value - WINDOW_SIZE)
  const newStart = clamp(visibleStart - BUFFER, 0, Math.min(maxByLoaded, maxByTotal))
  if (newStart !== windowStart.value) {
    windowStart.value = newStart
  }
}

/** 确保用户可见范围 [visibleStart, visibleStart + WINDOW_SIZE) 数据已加载，
 *  并把窗口滑动到该位置。顺序加载（不分页跳跃），避免 hashMap 出现空洞。 */
async function ensureVisibleRange(visibleStart: number) {
  if (loading.value) return
  // 数据已加载到可见范围：直接同步 windowStart
  const targetEnd = visibleStart + WINDOW_SIZE
  if (targetEnd <= loadedMax.value) {
    syncWindowStart(visibleStart)
    return
  }
  loading.value = true
  try {
    while (loadedMax.value < targetEnd && loadedMax.value < total.value) {
      const pageIndex = Math.floor(loadedMax.value / PAGE_SIZE) + 1
      const result = await mockGetMeetHrPage(pageIndex, PAGE_SIZE)
      total.value = result.total
      const base = (pageIndex - 1) * PAGE_SIZE
      result.data.forEach((row, i) => hashMap.set(base + i, row))
      loadedMax.value = base + result.data.length
      if (result.data.length === 0) break
    }
    // 加载完成后再同步：loadedMax 已增长，windowStart 可以推到正确位置
    syncWindowStart(visibleStart)
  } finally {
    loading.value = false
  }
}

// ==================== 滚动 handler ====================

const onScroll = useThrottleFn((e: Event) => {
  if (isEditing.value) return
  const target = e.target as HTMLElement
  scrollTopState.value = target.scrollTop
  const visibleStart = Math.floor(target.scrollTop / ROW_HEIGHT)
  void ensureVisibleRange(visibleStart)
}, 16)

// ==================== 生命周期 ====================

onMounted(async () => {
  total.value = await mockGetMeetHrCount()
  await ensureVisibleRange(0)
})

// ==================== 数据刷新（CRUD 后调用） ====================

/** 清空 hashMap 缓存并重新加载当前可见窗口（增删改后用） */
async function resetWindow() {
  hashMap.clear()
  loadedMax.value = 0
  total.value = await mockGetMeetHrCount()
  windowStart.value = clamp(windowStart.value, 0, Math.max(0, total.value - WINDOW_SIZE))
  // 重新加载当前可见范围
  const shell = scrollShellRef.value
  const visibleStart = shell ? Math.floor(shell.scrollTop / ROW_HEIGHT) : windowStart.value + BUFFER
  await ensureVisibleRange(visibleStart)
}

// CRUD 走共享 composable，刷新回调注入本实现的 resetWindow（清 hashMap 重新加载窗口）。
// isEditing 还被 scrollLockOverlay 用作 v-if 条件（编辑期间锁定滚动）。
const { isEditing, handleInsert, handleSave, handleDelete, handleEditActived, handleEditClosed } =
  useVxeGridCrud(gridRef, {
    addFn: mockAddMeetHr,
    updateFn: mockUpdateMeetHr,
    deleteFn: mockDeleteMeetHr,
    onAfterMutation: resetWindow,
  })

// 调试用：把内部状态挂到 window 上，便于在 DevTools Console 直接观察 hashMap 缓存命中、
// windowStart/loadedMax 推进情况（仅开发期，生产环境无影响）。
interface InfiniteWindowDebug {
  hashMap: Map<number, MeetHr>
  readonly windowStart: number
  readonly loadedMax: number
  readonly total: number
  readonly windowData: ReadonlyArray<MeetHr & { _globalSeq: number }>
  resetWindow: () => Promise<void>
}
declare global {
  interface Window {
    __infiniteWindowDebug?: InfiniteWindowDebug
  }
}
if (typeof window !== 'undefined') {
  window.__infiniteWindowDebug = {
    hashMap,
    get windowStart() {
      return windowStart.value
    },
    get loadedMax() {
      return loadedMax.value
    },
    get total() {
      return total.value
    },
    get windowData() {
      return windowData.value
    },
    resetWindow,
  }
}
</script>

<template>
  <div :class="$style.root">
    <CrudToolbar @insert="handleInsert" @delete="handleDelete" @save="handleSave">
      <span :class="$style.status">
        窗口 [{{ windowStart }}, {{ windowEnd }}) · 共 {{ total }} 条 · 已缓存 {{ hashMap.size }} · 已加载到
        {{ loadedMax }} · scrollTop {{ Math.round(scrollTopState) }}px
      </span>
    </CrudToolbar>
    <div :class="$style.tableContainer">
      <div :class="$style.stickyHeader">
        <div :class="$style.headerRow" :style="{ minWidth: FIXED_COLUMNS_TOTAL_WIDTH + 'px' }">
          <div :class="$style.headerCell" :style="{ width: FIXED_COLUMN_WIDTHS.checkbox + 'px' }" />
          <div :class="$style.headerCell" :style="{ width: FIXED_COLUMN_WIDTHS.seq + 'px' }">#</div>
          <div :class="$style.headerCell" :style="{ flex: 1 }">HR姓名</div>
          <div :class="$style.headerCell" :style="{ flex: 1 }">手机号</div>
          <div :class="$style.headerCell" :style="{ flex: 1 }">HR职位</div>
          <div :class="$style.headerCell" :style="{ flex: 1 }">我的职位</div>
          <div :class="$style.headerCell" :style="{ flex: 1 }">备注</div>
          <div :class="$style.headerCell" :style="{ width: FIXED_COLUMN_WIDTHS.createTime + 'px' }">
            创建时间
          </div>
          <div :class="$style.headerCell" :style="{ width: FIXED_COLUMN_WIDTHS.lastVisitTime + 'px' }">
            最后访问
          </div>
        </div>
      </div>
      <div ref="scrollShellRef" :class="$style.scrollShell" @scroll.passive="onScroll">
        <div :class="$style.spacer" :style="{ height: spacerHeight + 'px' }">
          <div :class="$style.gridWrapper" :style="{ top: offsetY + 'px', height: gridHeight + 'px' }">
            <vxe-grid
              ref="gridRef"
              v-bind="gridOptions"
              height="100%"
              :data="windowData"
              @edit-actived="handleEditActived"
              @edit-closed="handleEditClosed"
            />
            <div v-if="loading && !isWindowFullyLoaded" :class="$style.loadingOverlay">加载中…</div>
          </div>
        </div>
      </div>
      <div v-if="isEditing" :class="$style.scrollLockOverlay">
        <span>编辑中 · 滚动已锁定</span>
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

.status {
  margin-left: auto;
  font-size: 12px;
  color: #888;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.tableContainer {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.stickyHeader {
  flex-shrink: 0;
  overflow-x: auto;
  overflow-y: hidden;
  background: #f8f8f8;
  border-bottom: 1px solid #ddd;
}

.headerRow {
  display: flex;
  height: 48px;
  box-sizing: border-box;
}

.headerCell {
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  border-right: 1px solid #ddd;
  box-sizing: border-box;
  flex-shrink: 0;
}

.headerCell:last-child {
  border-right: none;
}

.scrollShell {
  flex: 1;
  min-height: 0;
  overflow: auto;
  position: relative;
  box-sizing: border-box;
}

.spacer {
  position: relative;
  width: 100%;
}

.gridWrapper {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
}

.loadingOverlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  color: #666;
  pointer-events: none;
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
}
</style>

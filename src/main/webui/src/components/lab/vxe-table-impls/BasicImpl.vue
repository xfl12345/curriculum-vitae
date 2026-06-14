<script setup lang="ts">
import type { VxeGridInstance, VxeGridListeners, VxeGridProps } from 'vxe-table'

import { useThrottleFn } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'

import type { MeetHr } from '@/model/web/api/meet-hr'

import CrudToolbar from './CrudToolbar.vue'
import { mockAddMeetHr, mockDeleteMeetHr, mockGetMeetHrPage, mockUpdateMeetHr } from './mock-data'
import { buildMeetHrColumns, PAGE_SIZE } from './shared'
import { useVxeGridCrud } from './useVxeGridCrud'

/**
 * 基础版（baseline）：concat 累加全部已加载数据到 tableData，靠 vxe-grid 自带的
 * virtualYConfig 做 DOM 虚拟化，滚到底时 scrollBoundary 事件触发下一页加载。
 * 作为另外两个实现的对比基准。
 */

const gridRef = ref<VxeGridInstance>()
const gridBoxRef = ref<HTMLElement>()

const tableData = ref<MeetHr[]>([])
const currentPage = ref(1)
const total = ref(0)
const loading = ref(false)
const pageSize = PAGE_SIZE
const hasMore = ref(true)

const gridOptions = computed<VxeGridProps<MeetHr>>(() => ({
  keepSource: true,
  border: true,
  stripe: true,
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
  virtualYConfig: {
    enabled: true,
    gt: 0,
    threshold: 300,
  },
  toolbarConfig: {
    enabled: false,
  },
  columns: buildMeetHrColumns(),
}))

async function loadPage() {
  if (loading.value || !hasMore.value) return
  loading.value = true
  try {
    const result = await mockGetMeetHrPage(currentPage.value, pageSize)
    tableData.value = tableData.value.concat(result.data)
    total.value = result.total
    currentPage.value++
    hasMore.value = tableData.value.length < total.value
  } catch {
    hasMore.value = false
  } finally {
    loading.value = false
  }
}

// 滚动触底时加载下一页；节流到 300ms 防抖动期间重复请求；
// 编辑期间禁止加载，避免新数据把正在编辑的行挤出可视区。
const scrollBoundary = useThrottleFn<Required<VxeGridListeners>['scrollBoundary']>((params) => {
  if (!hasMore.value || loading.value || isEditing.value) return
  if (params.direction === 'bottom') {
    void loadPage()
  }
}, 300)
const gridEvents: VxeGridListeners = {
  scrollBoundary,
}

async function resetAndReload() {
  tableData.value = []
  currentPage.value = 1
  total.value = 0
  hasMore.value = true
  await loadPage()
}

// CRUD 走共享 composable，刷新回调注入本实现的 resetAndReload（concat 重置到 page 1）
const { isEditing, handleInsert, handleSave, handleDelete, handleEditActived, handleEditClosed } =
  useVxeGridCrud(gridRef, {
    addFn: mockAddMeetHr,
    updateFn: mockUpdateMeetHr,
    deleteFn: mockDeleteMeetHr,
    onAfterMutation: resetAndReload,
  })

onMounted(() => {
  void loadPage()
})
</script>

<template>
  <div :class="$style.root">
    <CrudToolbar @insert="handleInsert" @delete="handleDelete" @save="handleSave">
      <span :class="$style.status">已加载 {{ tableData.length }} / 总 {{ total }} 条</span>
    </CrudToolbar>
    <div ref="gridBoxRef" :class="$style.gridBox">
      <vxe-grid
        ref="gridRef"
        v-bind="gridOptions"
        height="100%"
        :data="tableData"
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

.status {
  margin-left: auto;
  font-size: 12px;
  color: #888;
}

.gridBox {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
}
</style>

<script setup lang="ts">
import type { VxeGridInstance, VxeGridProps } from 'vxe-table'

import { computed, onMounted, ref } from 'vue'

import type { MeetHr } from '@/model/web/api/meet-hr'

import CrudToolbar from './CrudToolbar.vue'
import { mockAddMeetHr, mockDeleteMeetHr, mockGetMeetHrPage, mockUpdateMeetHr } from './mock-data'
import { buildMeetHrColumns, PAGE_SIZE } from './shared'
import { useVxeGridCrud } from './useVxeGridCrud'

/**
 * 朴素反例：故意去掉 virtualYConfig（让 DOM 行数随数据量线性增长），
 * 数据靠手动点按钮 concat 累加，加载 1000+ 行后滚动肉眼可见卡顿，
 * 作为 InfiniteWindowImpl「零卡顿」的反衬。
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
  showOverflow: true,
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
  // 故意不设 virtualYConfig，让 DOM 节点数随数据量线性增长（反例核心）
  toolbarConfig: {
    enabled: false,
  },
  columns: buildMeetHrColumns(),
}))

async function loadNextPage() {
  if (loading.value || !hasMore.value) return
  loading.value = true
  try {
    const result = await mockGetMeetHrPage(currentPage.value, pageSize)
    tableData.value = tableData.value.concat(result.data)
    total.value = result.total
    currentPage.value++
    hasMore.value = tableData.value.length < total.value
  } finally {
    loading.value = false
  }
}

async function loadAll() {
  while (hasMore.value) {
    await loadNextPage()
  }
}

async function resetAndReload() {
  tableData.value = []
  currentPage.value = 1
  total.value = 0
  hasMore.value = true
  await loadNextPage()
}

const { isEditing, handleInsert, handleSave, handleDelete, handleEditActived, handleEditClosed } =
  useVxeGridCrud(gridRef, {
    addFn: mockAddMeetHr,
    updateFn: mockUpdateMeetHr,
    deleteFn: mockDeleteMeetHr,
    onAfterMutation: resetAndReload,
  })

onMounted(() => {
  void loadNextPage()
})
</script>

<template>
  <div :class="$style.root">
    <CrudToolbar @insert="handleInsert" @delete="handleDelete" @save="handleSave">
      <span :class="$style.divider" />
      <button type="button" :class="$style.btn" :disabled="!hasMore || loading" @click="loadNextPage">
        {{ loading ? '加载中…' : `加载第 ${currentPage} 页` }}
      </button>
      <button type="button" :class="$style.btn" :disabled="!hasMore || loading" @click="loadAll">
        一次性全部加载
      </button>
      <span :class="$style.status">
        已加载 {{ tableData.length }} / 总 {{ total }} 条 · DOM 行数 = 数据量（无虚拟化）
      </span>
    </CrudToolbar>
    <div ref="gridBoxRef" :class="$style.gridBox">
      <vxe-grid
        ref="gridRef"
        v-bind="gridOptions"
        height="100%"
        :data="tableData"
        @edit-actived="handleEditActived"
        @edit-closed="handleEditClosed"
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

/* slot 里两个白底按钮的样式（CrudToolbar 的 .toolbar button 提供基础样式） */
.btn {
  background-color: #fff;
  color: #333;
}

.divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 4px;
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

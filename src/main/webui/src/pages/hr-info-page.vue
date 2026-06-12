<script setup lang="ts">
import type { VxeGridInstance, VxeGridListeners, VxeGridProps } from 'vxe-table'

import { useThrottleFn } from '@vueuse/core'
import { Temporal } from 'temporal-polyfill'
import { computed, onMounted, ref } from 'vue'

import type { MeetHr } from '@/model/web/api/meet-hr'

import { VxeTableReact } from '@/components'
import { addMeetHr, deleteMeetHr, getMeetHrPage, updateMeetHr } from '@/model/web/api/meet-hr'

function formatIsoTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  try {
    const pdt = Temporal.PlainDateTime.from(iso)
    return `${pdt.year}-${String(pdt.month).padStart(2, '0')}-${String(pdt.day).padStart(2, '0')} ${String(pdt.hour).padStart(2, '0')}:${String(pdt.minute).padStart(2, '0')}:${String(pdt.second).padStart(2, '0')}`
  } catch {
    return iso
  }
}

const gridRef = ref<VxeGridInstance>()
const gridTemplateRef = computed<HTMLElement | null>(() => gridRef.value?.$el ?? null)
const gridBoxRef = ref<HTMLElement>()

const tableData = ref<MeetHr[]>([])
const currentPage = ref(1)
const total = ref(0)
const loading = ref(false)
const isEditing = ref(false)
const pageSize = 100
const hasMore = ref(true)

const gridReact = new VxeTableReact(gridTemplateRef)

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
  virtualXConfig: {
    enabled: true,
    gt: 0,
  },
  toolbarConfig: {
    enabled: false,
  },
  columns: [
    { type: 'checkbox', width: 50 },
    { type: 'seq', width: 60, title: '#' },
    { field: 'hrName', title: 'HR姓名', editRender: { name: 'input' } },
    { field: 'hrPhoneNumber', title: '手机号', editRender: { name: 'input' } },
    { field: 'hrJob', title: 'HR职位', editRender: { name: 'input' } },
    { field: 'myJob', title: '我的职位', editRender: { name: 'input' } },
    { field: 'note', title: '备注', editRender: { name: 'input' } },
    {
      field: 'createTime',
      title: '创建时间',
      width: 170,
      formatter: ({ cellValue }) => formatIsoTime(cellValue),
    },
    {
      field: 'lastVisitTime',
      title: '最后访问',
      width: 170,
      formatter: ({ cellValue }) => formatIsoTime(cellValue),
    },
  ],
}))

async function loadPage() {
  if (loading.value || !hasMore.value) return
  loading.value = true
  try {
    console.info(`正在拉取 第${currentPage.value}页 数据，当前 pageSize=[${pageSize}]`)
    const result = await getMeetHrPage(currentPage.value, pageSize)
    // tableData.value.concat()
    tableData.value = [...tableData.value, ...result.data]
    total.value = result.total
    currentPage.value++
    hasMore.value = tableData.value.length < total.value
  } catch {
    hasMore.value = false
  } finally {
    loading.value = false
  }
}

// 使用 vxe-grid 自带的 scroll 事件
const scrollBoundary = useThrottleFn<Required<VxeGridListeners>['scrollBoundary']>((params) => {
  console.log('scrollBoundary', params)
  if (!hasMore.value || loading.value || isEditing.value) return
  const { direction } = params
  if (direction === 'bottom') {
    loadPage()
  }
}, 300)
const gridEvents: VxeGridListeners = {
  // scroll: handleScroll,
  scrollBoundary,
}

async function resetAndReload() {
  tableData.value = []
  currentPage.value = 1
  total.value = 0
  hasMore.value = true
  console.log('resetAndReload')
  await loadPage()
}

// 调试用：暴露到 window
if (window) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as Record<string, any>).__meetHrDebug = {
    gridRef,
    gridBoxRef,
    gridReact,
  }
}

onMounted(() => {
  loadPage()
})

function handleEditActived() {
  isEditing.value = true
}

function handleEditClosed() {
  isEditing.value = false
}

async function handleInsert() {
  const gridInstance = gridRef.value
  if (!gridInstance) return
  const { row } = await gridInstance.insert({
    id: -Date.now(),
    hrName: '',
    hrPhoneNumber: '',
    hrJob: '',
    myJob: '',
    note: '',
  })
  await gridInstance.setEditRow(row)
}

async function handleSave() {
  const gridInstance = gridRef.value
  if (!gridInstance) return
  const { insertRecords, updateRecords } = gridInstance.getRecordset()
  for (const record of insertRecords as MeetHr[]) {
    record.id = undefined
    await addMeetHr(record)
  }
  for (const record of updateRecords as MeetHr[]) {
    if (record.id) {
      await updateMeetHr(record.id, record)
    }
  }
  await gridInstance.clearEdit()
  await resetAndReload()
}

async function handleDelete() {
  const gridInstance = gridRef.value
  if (!gridInstance) return
  const selectRecords = gridInstance.getCheckboxRecords()
  for (const record of selectRecords as MeetHr[]) {
    if (record.id && record.id > 0) {
      await deleteMeetHr(record.id)
    }
  }
  await resetAndReload()
}
</script>

<template>
  <div :class="$style.root">
    <div :class="$style.toolbar">
      <button type="button" :class="$style.btnSuccess" @click="handleInsert">新增</button>
      <button type="button" :class="$style.btnDanger" @click="handleDelete">删除选中</button>
      <button type="button" :class="$style.btnPrimary" @click="handleSave">保存</button>
    </div>
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
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.toolbar button {
  padding: 6px 16px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  cursor: pointer;
  font-size: 14px;
}

.btnPrimary {
  color: #fff;
  background-color: #409eff;
  border-color: #409eff;
}

.btnSuccess {
  color: #fff;
  background-color: #67c23a;
  border-color: #67c23a;
}

.btnDanger {
  color: #fff;
  background-color: #f56c6c;
  border-color: #f56c6c;
}

.gridBox {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
}
</style>

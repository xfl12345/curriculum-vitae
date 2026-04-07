<script setup lang="ts">
import type { VxeGridInstance, VxeGridProps } from 'vxe-table'

import { ref } from 'vue'

const xGrid = ref<VxeGridInstance>()
const selectRecords = ref<object[]>([])

function handleVxeTableAjaxQuery() {
  return Promise.resolve(666)
}

function handlePageChange() {}

const gridOptions = ref<VxeGridProps>({
  loading: false,
  height: '700px',
  headerAlign: 'center',
  keepSource: true,
  autoResize: true,
  stripe: true,
  border: true,
  customConfig: {
    storage: {
      visible: true,
      resizable: true,
    },
  },
  editConfig: {
    trigger: 'manual',
    mode: 'row',
    showStatus: true,
  },
  columnConfig: {
    resizable: true,
    isCurrent: true,
    isHover: true,
    useKey: true,
  },
  rowConfig: {
    isCurrent: true,
    isHover: true,
    useKey: true,
  },
  mouseConfig: {
    selected: true,
  },
  toolbarConfig: {
    custom: true,
    refresh: {
      queryMethod: handleVxeTableAjaxQuery,
    },
  },
  pagerConfig: {
    pageSize: 15,
  },
  columns: [
    { type: 'checkbox', width: 60 },
    { field: 'name', title: 'Name', width: 200, resizable: false },
    { field: 'age', title: 'Age', width: 100 },
    {
      field: 'num1',
      title: 'Num1',
      showHeaderOverflow: true,
      filters: [{ data: '' }],
      editRender: { autofocus: '.my-input' },
    },
  ],
})
</script>

<template>
  <div :class="$style.root">
    <vxe-grid ref="xGrid" v-bind="gridOptions">
      <template #pager>
        <vxe-pager perfect @page-change="handlePageChange">
          <template #left>
            <span :class="$style.pageLeft">
              <span>已选中 {{ selectRecords.length }} 条&nbsp;</span>
              <vxe-button>修改</vxe-button>
              <vxe-button>删除</vxe-button>
            </span>
          </template>
        </vxe-pager>
      </template>
    </vxe-grid>
  </div>
</template>

<style module>
.root {
  padding: 20px;
}

.pageLeft {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>

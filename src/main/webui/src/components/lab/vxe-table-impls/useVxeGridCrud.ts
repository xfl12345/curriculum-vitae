import type { VxeGridInstance } from 'vxe-table'

import { ref, type Ref } from 'vue'

import type { MeetHr } from '@/model/web/api/meet-hr'

import { createEmptyMeetHr } from './shared'

/**
 * 三个 vxe-table 实现共享的 CRUD 行为：
 * - handleInsert：插入一条空行并进入编辑态
 * - handleSave：从 vxe-grid 取出 insertRecords/updateRecords，调对应 API，再触发 onAfterMutation 刷新
 * - handleDelete：从 vxe-grid 取出 checkbox 选中的行，调 deleteFn，再刷新
 * - isEditing + handleEditActived/Closed：跟踪 vxe-grid 的编辑态（让滚动加载/窗口切换在编辑期间锁定）
 *
 * 各实现的数据存储不同（concat 实现 reload page 1，window 实现清 hashMap 重新加载窗口），
 * 所以刷新逻辑通过 onAfterMutation 回调注入，composable 不关心具体怎么 reload。
 */
export interface UseVxeGridCrudOptions {
  addFn: (record: MeetHr) => Promise<unknown>
  updateFn: (id: number, record: MeetHr) => Promise<unknown>
  deleteFn: (id: number) => Promise<unknown>
  /** 增删改完成后的刷新回调（每个实现自定义：concat 实现 reload page 1，window 实现清 hashMap） */
  onAfterMutation: () => Promise<void> | void
}

export function useVxeGridCrud(gridRef: Ref<VxeGridInstance | undefined>, opts: UseVxeGridCrudOptions) {
  const isEditing = ref(false)

  function handleEditActived() {
    isEditing.value = true
  }

  function handleEditClosed() {
    isEditing.value = false
  }

  async function handleInsert() {
    const grid = gridRef.value
    if (!grid) return
    const { row } = await grid.insert(createEmptyMeetHr())
    await grid.setEditRow(row)
  }

  async function handleSave() {
    const grid = gridRef.value
    if (!grid) return
    const { insertRecords, updateRecords } = grid.getRecordset()
    for (const record of insertRecords as MeetHr[]) {
      // 新增记录没有真实 id（前端临时用了 -Date.now() - seed 占位），交给后端分配
      record.id = void 0
      await opts.addFn(record)
    }
    for (const record of updateRecords as MeetHr[]) {
      if (record.id) {
        await opts.updateFn(record.id, record)
      }
    }
    await grid.clearEdit()
    await opts.onAfterMutation()
  }

  async function handleDelete() {
    const grid = gridRef.value
    if (!grid) return
    const selectRecords = grid.getCheckboxRecords()
    for (const record of selectRecords as MeetHr[]) {
      if (record.id && record.id > 0) {
        await opts.deleteFn(record.id)
      }
    }
    await opts.onAfterMutation()
  }

  return {
    isEditing,
    handleInsert,
    handleSave,
    handleDelete,
    handleEditActived,
    handleEditClosed,
  }
}

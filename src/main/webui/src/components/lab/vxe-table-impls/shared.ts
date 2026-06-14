import type { VxeColumnProps } from 'vxe-table'

import { Temporal } from 'temporal-polyfill'

import type { MeetHr } from '@/model/web/api/meet-hr'

// ==================== 常量 ====================

/** 单行高度（px）。InfiniteWindowImpl 用它计算 spacer 高度和 offset。
 *  Step 4 在 chrome-devtools 实测后会校准此值。 */
export const ROW_HEIGHT = 48

/** InfiniteWindowImpl 的窗口大小（DOM 中渲染的行数，含上下缓冲） */
export const WINDOW_SIZE = 80

/** InfiniteWindowImpl 的上下缓冲行数 */
export const BUFFER = 15

/** mock 分页大小 */
export const PAGE_SIZE = 100

// ==================== 工具函数 ====================

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

// 新增行的临时 id 种子：原代码用 -Date.now() 做临时 id，连续快速点击「新增」时
// 同一毫秒会生成重复 id（vxe-grid 用 rowConfig.keyField='id' 做 diff），可能
// 导致 checkbox 选不中、删除误伤等问题。这里加自增 seed 兜底。
let insertIdSeed = 0

/** 生成一条空白 MeetHr 行（供 handleInsert 插入 vxe-grid 后立即进入编辑态）。
 *  临时 id 用负数避免和后端真实 id 冲突；保存时由 useVxeGridCrud 清成 void 0
 *  让后端分配真实 id。 */
export function createEmptyMeetHr(): MeetHr {
  return {
    id: -Date.now() - insertIdSeed++,
    hrName: '',
    hrPhoneNumber: '',
    hrJob: '',
    myJob: '',
    note: '',
  }
}

export function formatIsoTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  try {
    const pdt = Temporal.PlainDateTime.from(iso)
    return `${pdt.year}-${String(pdt.month).padStart(2, '0')}-${String(pdt.day).padStart(2, '0')} ${String(pdt.hour).padStart(2, '0')}:${String(pdt.minute).padStart(2, '0')}:${String(pdt.second).padStart(2, '0')}`
  } catch {
    return iso
  }
}

// ==================== 列定义 ====================

export interface BuildColumnsOptions {
  /** 所有列设固定 width，配合 InfiniteWindowImpl 的手写 sticky header 对齐 */
  fixedLayout?: boolean
  /** 用普通字段列代替 vxe-grid 的 type=seq。
   *  Vxe-grid 内部缓存了 seq 配置，windowStart 变化时不会重读 seqConfig.startIndex。
   *  用普通字段（field='_globalSeq'）则每行数据自带全局行号，绕过此问题。 */
  seqAsField?: boolean
}

export function buildMeetHrColumns(opts: BuildColumnsOptions = {}): VxeColumnProps[] {
  // 注意：vxe-grid 的 seqConfig.startIndex 是 grid 级 prop，且不会随 columns 变化重新读取。
  // 需要全局连续行号时改用 seqAsField=true（每条数据自带 _globalSeq 字段）。
  const seqCol: VxeColumnProps = opts.seqAsField
    ? { field: '_globalSeq', title: '#', width: 60, align: 'right' }
    : { type: 'seq', width: 60, title: '#' }

  if (opts.fixedLayout) {
    // fixedLayout 含义：固定列（checkbox/seq/时间列）保留 fixed width，让 InfiniteWindowImpl
    // 的手写 sticky header 能精确对齐；文本列（hrName 等 5 列）不设 width，vxe-grid 会自动
    // 平分剩余宽度，配合 sticky header 同样数量的 flex:1 cell，实现"吃满宽度 + 列对齐"。
    return [
      { type: 'checkbox', width: FIXED_COLUMN_WIDTHS.checkbox },
      seqCol,
      { field: 'hrName', title: 'HR姓名', editRender: { name: 'input' } },
      { field: 'hrPhoneNumber', title: '手机号', editRender: { name: 'input' } },
      { field: 'hrJob', title: 'HR职位', editRender: { name: 'input' } },
      { field: 'myJob', title: '我的职位', editRender: { name: 'input' } },
      { field: 'note', title: '备注', editRender: { name: 'input' } },
      {
        field: 'createTime',
        title: '创建时间',
        width: FIXED_COLUMN_WIDTHS.createTime,
        formatter: ({ cellValue }) => formatIsoTime(cellValue),
      },
      {
        field: 'lastVisitTime',
        title: '最后访问',
        width: FIXED_COLUMN_WIDTHS.lastVisitTime,
        formatter: ({ cellValue }) => formatIsoTime(cellValue),
      },
    ]
  }

  return [
    { type: 'checkbox', width: 50 },
    seqCol,
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
  ]
}

/** 自适应（flex）文本列的数量。vxe-grid 不设 width 时按"剩余均分"，
 *  sticky header 对应 cell 用 flex:1，两者算法一致因此对齐。 */
export const FLEX_COLUMN_COUNT = 5

/** fixedLayout 模式下保留固定 width 的列（其他列让 vxe-grid 自动平分）。
 *  与 buildMeetHrColumns opts.fixedLayout=true 保持一致，调整时两处同步。 */
export const FIXED_COLUMN_WIDTHS = {
  checkbox: 50,
  seq: 60,
  createTime: 170,
  lastVisitTime: 170,
} as const

/** fixedLayout 模式下，固定列的总宽度（用于 min-width 兜底，避免容器过窄时挤压）。 */
export const FIXED_COLUMNS_TOTAL_WIDTH = Object.values(FIXED_COLUMN_WIDTHS).reduce((sum, w) => sum + w, 0)

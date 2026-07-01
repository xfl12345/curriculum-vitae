<script setup lang="ts">
/**
 * 分页块面板（PageBlockPanel）—— InfinitePagesImpl 把每页表格抽象成的前端组件。
 *
 * 为什么需要这个子组件（设计缘由）：
 * - 父组件 v-for 渲染多页时，每页需要不同的 translateY 像素位置。
 * - Vue 3 的 v-bind() in CSS 是组件作用域的——同一个 SFC 内所有元素共享同一个 v-bind 值，
 *   无法在 v-for 里给每次迭代注入不同的 CSS 变量。
 * - 把单页抽成子组件后，每个实例都有独立的 setup 作用域，v-bind() 自然按本实例的
 *   pageIdx prop 算出独有的 top 像素值——这是「CSS no-inline style」规范下处理
 *   per-iteration 动态位置的标准模式（参考 InfiniteTransformTrickImpl 的 DataPanel）。
 *
 * 与 InfinitePagesImpl 的分工：
 * - 父组件：维护 rowCache / renderedPageIndices / pageBlockHeight / spacerHeight 等
 *   全局状态，把每页所需的 data 数组（按 pageIdx 从 rowCache 切出）作为 prop 传入。
 * - 子组件：负责单页 DOM 结构（分割条 + vxe-grid）、vxe-grid 实例持有、CRUD 原语封装。
 *
 * 与 DataPanel.vue 的差异：
 * - DataPanel 用 tank tread 模式（panelId 固定，pageIdx 在 Map 里动态变化）。
 * - 本组件 pageIdx 直接作 prop（父组件按需 mount/unmount，不回收面板）。
 *
 * 暴露给父级的语义化操作（defineExpose）：insert / getPendingChanges /
 * getSelectedRecords / clearEdit / cancel。父级用 function ref 按 pageIdx 收集实例，
 * CRUD 时按 pageIdx 路由到对应面板。
 */

import type { VxeGridInstance, VxeGridProps } from 'vxe-table'

import { computed, ref } from 'vue'

import type { MeetHr } from '@/model/web/api/meet-hr'

interface Props {
  /** 本面板固定显示的页号（0-based）。父组件 v-for 时按索引传入，永不变化。 */
  pageIdx: number
  /** 单页块高度（含分割条 + 表头 + pageSize 行）。父组件按 pageBlockHeight 计算确定值。 */
  pageBlockHeight: number
  /** 分割条高度（InfinitePagesImpl 的 DIVIDER_HEIGHT 常量）。 */
  dividerHeight: number
  /** vxe-grid 配置（columns/editConfig 等）。父级创建一次后传同一引用。 */
  gridOptions: VxeGridProps<MeetHr>
  /**
   * 本页的行数组。
   *
   * 父级 renderedPageData computed 已经做了"内容未变则复用旧数组引用"的浅比较 memoize，
   * vxe-grid 看到 :data 引用未变会跳过 calcCellHeight 等强制 reflow——子组件只作透传，
   * 不再做响应式包装，保持引用稳定。
   */
  data: MeetHr[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  /** 用户双击某行进入编辑态，把当前面板的 pageIdx 透传给父级 */
  editActived: [pageIdx: number]
  /** 编辑关闭（cell blur 或外部 clearEdit） */
  editClosed: []
}>()

/**
 * 本面板的 top 像素位置：pageIdx × pageBlockHeight。
 *
 * 用 JS 字符串 computed 而非 calc(v-bind(pageIdx) * v-bind(pageBlockHeight) * 1px)：
 * - 两层 v-bind 嵌入 calc 表达式可读性差，且 pageBlockHeight 在 .pageBlock 里还要单用一次
 *   height（共 2 次非平凡用法），按 vue-css-class-over-style 规范该抽 computed。
 * - 字符串拼接一次完成，CSS 端只剩纯 v-bind，更直观。
 */
const panelTop = computed(() => `${props.pageIdx * props.pageBlockHeight}px`)

const gridRef = ref<VxeGridInstance>()

function onEditActived() {
  emit('editActived', props.pageIdx)
}

function onEditClosed() {
  emit('editClosed')
}

// ==================== 暴露给父级的语义化操作 ====================
//
// 设计缘由：父组件不应直接操作 vxe-grid 实例（脏、紧耦合、易误用）。
// 这里封装父组件需要的 5 个 CRUD 原语，把 grid 实例藏在 PageBlockPanel 内部。
// 父组件用 function ref 按 pageIdx 收集所有 PageBlockPanel 实例，CRUD 时按需取用。
// API 与 DataPanel.vue 严格一致，便于复用同一套父级 CRUD 模板。

/**
 * 新增：在当前 grid 顶部插入一行并立即进入编辑态。
 * @param emptyRow 父组件构造的空记录（含默认值），由父级决定字段语义
 */
async function insert(emptyRow: MeetHr): Promise<void> {
  const grid = gridRef.value
  if (!grid) return
  const { row } = await grid.insert(emptyRow)
  await grid.setEditRow(row)
}

/**
 * 读取待提交的变更（不修改编辑状态）。
 *
 * 父级保存流程：先读所有面板的 pending changes 收集 API 任务，再统一调 clearEdit。
 * 不在此方法内 clearEdit：父级可能想先校验/聚合多面板变更再决定是否清编辑态。
 */
function getPendingChanges(): { insertRecords: MeetHr[]; updateRecords: MeetHr[] } {
  const grid = gridRef.value
  if (!grid) return { insertRecords: [], updateRecords: [] }
  const { insertRecords, updateRecords } = grid.getRecordset()
  return {
    insertRecords: insertRecords as MeetHr[],
    updateRecords: updateRecords as MeetHr[],
  }
}

/** 读取多选勾选的行（删除用） */
function getSelectedRecords(): MeetHr[] {
  const grid = gridRef.value
  if (!grid) return []
  return grid.getCheckboxRecords() as MeetHr[]
}

/** 关闭编辑态（不还原数据）。保存流程的最后一步 */
async function clearEdit(): Promise<void> {
  await gridRef.value?.clearEdit()
}

/**
 * 取消编辑：clearEdit 让 in-flight 编辑值 commit 到 updateRecords，
 * 再 getRecordset 读完整变更并撤销。
 *
 * 顺序很关键：先 getRecordset 再 clearEdit 会漏掉正在编辑的值
 * （clearEdit 反而把它 commit 进 updateRecords，但还原已过）。
 */
async function cancel(): Promise<void> {
  const grid = gridRef.value
  if (!grid) return
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

defineExpose({ insert, getPendingChanges, getSelectedRecords, clearEdit, cancel })
</script>

<template>
  <div :class="$style.pageBlock">
    <div :class="$style.pageDivider">
      <span :class="$style.pageDividerText">第 {{ pageIdx + 1 }} 页</span>
    </div>
    <div :class="$style.gridWrapper">
      <vxe-grid
        ref="gridRef"
        v-bind="props.gridOptions"
        height="100%"
        :data="props.data"
        @edit-actived="onEditActived"
        @edit-closed="onEditClosed"
      />
    </div>
  </div>
</template>

<style module>
/* 单页块：absolute 定位 + top 平移到本页在 spacer 中的位置。
 *
 * 关键点（vue-css-class-over-style 规范）：
 * - 不再用 :style="{ '--pblock-top': pageIdx × pageBlockHeight + 'px' }" 注入 CSS 变量。
 *   父组件 v-for 里这种 per-iteration 内联 style 是规范红线——抽成子组件后，每个实例
 *   有独立 setup 作用域，v-bind(panelTop) 自动按本实例的 props.pageIdx 算出独有值。
 * - panelTop 在 JS 里完成 pageIdx × pageBlockHeight 计算并拼成 'Npx' 字符串，
 *   CSS 端只剩单次 v-bind，可读性比 calc(v-bind(pageIdx) * v-bind(pageBlockHeight) * 1px) 高。
 *
 * content-visibility: auto + contain-intrinsic-size（性能关键，从 InfinitePagesImpl 迁移）：
 * - 让浏览器跳过离屏 page-block 的渲染/布局/绘制工作。
 * - 单个 page 内 vxe-grid 的 DOM ~2500 个元素（50 行 × 9 列 × 多层 wrapper），
 *   4 个同时渲染 = 1 万元素。无 content-visibility 时每次 layout 几乎全节点参与。
 * - contain-intrinsic-size 给离屏 block 一个占位高度，避免滚动条估算抖动。 */
.pageBlock {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  content-visibility: auto;
  contain-intrinsic-size: auto 2488px;
  top: v-bind(panelTop);
  height: calc(v-bind('pageBlockHeight') * 1px);
}

/* 分割条：实心蓝底白字，让用户一眼看出"这是第 X 页"。
 * 用渐变让视觉上更突出；letter-spacing 让"第 X 页"显得更正式。
 * z-index: 1 与 InfinitePagesImpl 的 scrollLockOverlay（z-index: 10）错开。 */
.pageDivider {
  background: linear-gradient(90deg, #1890ff 0%, #409eff 50%, #1890ff 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.3);
  z-index: 1;
  height: calc(v-bind('dividerHeight') * 1px);
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

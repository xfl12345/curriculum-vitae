<script setup lang="ts">
/**
 * 数据面板（DataPanel）—— transform trick 架构的「数据层」。
 *
 * 角色（两层架构中的上层，z-index: 2）：
 * - 不透明背景覆盖骨架层，显示真实的分割条 + vxe-grid 数据
 * - IN_RANGE 模式：onScroll 时即时更新（父组件原子切换 pageIdx + transform + data）
 * - OUT_OF_RANGE 模式：完全冻结（父组件不修改 props），由父级每 300ms 节流唤醒一次
 *   重新计算所有面板状态，然后再次冻结
 *
 * 与骨架层的分工（两层都自带分割条，不依赖透明穿透）：
 * - IN_RANGE：数据层与骨架层 pageIdx 同步重合，数据层不透明白底盖住骨架层，
 *   用户看到的是数据层的分割条 + 真实数据。
 * - OUT_OF_RANGE：数据层冻结在旧 pageIdx（旧位置可能已滚出视口），骨架层即时
 *   追踪到新 pageIdx（视口内），用户在新位置看到骨架层的分割条 + shimmer 占位。
 * - 两层各自位于自己的 translateY 位置，永远不会重叠，因此各自渲染分割条不会
 *   产生"双分割条"视觉冲突，也无需透明 hack 让下层穿透。
 *
 * 与 InfinitePagesImpl 的本质差异：
 * - 后者：每个页号一个 grid 实例，跨页时 mount/unmount（vxe-grid 挂载开销 ~秒级）
 * - 本实现：固定 panelCount 个 grid 实例永远活着，只通过 transform 平移 + data 切换
 *
 * 关键性能点：
 * - v-for key=panelId（永不变），避免 grid 卸载重建
 * - :data 引用由父组件 memoize（同内容数组复用引用），避免 vxe-grid 重跑 calcCellHeight
 * - 多一个 40px 分割条 div 的渲染开销远低于 vxe-grid 自身，无需省略
 */

import type { VxeGridInstance, VxeGridProps } from 'vxe-table'

import { ref } from 'vue'

import type { MeetHr } from '@/model/web/api/meet-hr'

interface Props {
  /** 面板固定 ID（用于 v-for key 和 grid 实例收集，永不变化） */
  panelId: number
  /** 当前显示的页号（0-based）。父组件按滚动模式决定何时更新 */
  pageIdx: number
  /** 单页块高度。所有面板共享同一公式 translateY(pageIdx × pageBlockHeight) */
  pageBlockHeight: number
  /** 分割条高度（与骨架层一致，让两层在垂直方向完美对齐） */
  dividerHeight: number
  /** vxe-grid 配置（columns/editConfig 等）。父级 memoize 后传同一引用 */
  gridOptions: VxeGridProps<MeetHr>
  /** 该页的行数据。父级用 memoize 保证引用稳定，未加载时传空数组 */
  data: MeetHr[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  /** 用户双击某行进入编辑态，把当前面板的 pageIdx 透传给父级 */
  editActived: [pageIdx: number]
  /** 编辑关闭（cell blur 或外部 clearEdit） */
  editClosed: []
}>()

const gridRef = ref<VxeGridInstance>()

function onEditActived() {
  // 透传 pageIdx 给父级：父级用 pageIdx 路由后续 CRUD 操作（哪个 grid 进入编辑）
  emit('editActived', props.pageIdx)
}

function onEditClosed() {
  emit('editClosed')
}

// 暴露 grid 实例给父级：父级用 panelId 收集，CRUD 时取出对应实例
defineExpose({
  getGrid: () => gridRef.value,
})
</script>

<template>
  <div
    :class="$style.panel"
    :style="{
      transform: `translateY(${props.pageIdx * props.pageBlockHeight}px)`,
      height: `${props.pageBlockHeight}px`,
    }"
  >
    <!-- 数据层自带分割条：样式与 InfinitePagesImpl 的 pageDivider 严格一致，
         让用户在 IN_RANGE 滚动时看到"延续"的页码分割条。
         不再用透明占位穿透骨架层——直接渲染真实分割条，避免双层 z-index 的透明 hack。
         OUT_OF_RANGE 时数据层在旧 pageIdx 冻结，骨架层在新 pageIdx 显示分割条，
         两层位于不同 translateY 位置永不重叠，不会出现"双分割条" -->
    <div :class="$style.pageDivider" :style="{ height: `${props.dividerHeight}px` }">
      <span :class="$style.pageDividerText">第 {{ props.pageIdx + 1 }} 页</span>
    </div>

    <div :class="$style.gridWrapper">
      <vxe-grid
        ref="gridRef"
        v-bind="props.gridOptions"
        height="auto"
        :data="props.data"
        @edit-actived="onEditActived"
        @edit-closed="onEditClosed"
      />
    </div>
  </div>
</template>

<style module>
/* 数据层面板：absolute 定位 + transform 平移，覆盖在骨架层（z-index 1）之上。
 * - background:#fff 不透明白底：IN_RANGE 时完全盖住骨架层（分割条和 shimmer 都不可见），
 *   让用户视觉焦点在真实数据；OUT_OF_RANGE 时数据层在旧 pageIdx 冻结已滚出视口，
 *   视口内只有骨架层在新 pageIdx，不会出现两层重叠。
 * - z-index: 2：在骨架层之上 */
.panel {
  position: absolute;
  left: 0;
  right: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  will-change: transform;
  z-index: 2;
  background: #fff;
}

/* 分割条：与 InfinitePagesImpl 的 pageDivider 视觉完全一致。
 * 在数据层直接渲染（而非透明占位穿透骨架层），代码更直观、无需透明 hack。
 * 多一个 40px div 的渲染开销可忽略（panelCount 个面板 = panelCount 个 div） */
.pageDivider {
  background: linear-gradient(90deg, #1890ff 0%, #409eff 50%, #1890ff 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.3);
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
  background: #fff;
}
</style>

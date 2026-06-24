<script setup lang="ts">
/**
 * 骨架面板（SkeletonPanel）—— transform trick 架构的「即时响应层」。
 *
 * 角色（两层架构中的底层，z-index: 1）：
 * - 始终即时响应用户滚动，onScroll 时立即更新 pageIdx + translateY
 * - 在数据层（DataPanel）之下作为兜底显示，绝不留 UI 空洞
 * - 显示「第 X 页」分割条 + 列形骨架（表头 + pageSize 行）
 * - 视觉上强烈反馈「现在滚动到了第几页」，避免数据未加载时的空白感
 *
 * 与数据层（DataPanel）的分工（两层都自带分割条，不依赖透明穿透）：
 * - IN_RANGE：数据层与骨架层 pageIdx 同步重合，数据层（z-index 2，不透明白底）
 *   完全盖住骨架层，用户看到的是数据层的分割条 + 真实数据。
 * - OUT_OF_RANGE：数据层冻结在旧 pageIdx（旧位置通常已滚出视口），骨架层即时
 *   追踪到新 pageIdx（视口内），用户在新位置看到骨架层的分割条 + shimmer 占位。
 * - 两层各自位于自己的 translateY 位置，永不重叠——即使都渲染分割条也不会出现
 *   "双分割条"，因此骨架层不需要透明背景，数据层也不需要透明 hack。
 *
 * 与 InfinitePagesImpl 的本质差异：
 * - 后者是「按需挂载 grid」：每页一个 grid 实例，跨页时挂载/卸载（vxe-grid 挂载开销 ~秒级）
 * - 本实现是「零挂载/卸载」：固定 panelCount 个面板永远活着，只是切换显示哪页
 *
 * 设计缘由：软件心理学——UI 必须以闪电般的速度响应用户输入，渐进式加载可以接受。
 * 骨架层就是那个「闪电响应」，数据层是「渐进加载」。
 */

import { computed } from 'vue'

import { FIXED_COLUMN_WIDTHS, FLEX_COLUMN_COUNT } from './shared'

interface Props {
  /** 面板固定 ID（用于 v-for key 和 reactive Map 的索引，永不变化） */
  panelId: number
  /**
   * 父组件维护的「panelId → pageIdx」reactive Map（坦克履带模式）。
   *
   * 父组件用数论取模代表元算法 + watch diff 只更新变化的 entry，
   * 子组件自己 computed 读自己 panelId 对应的 entry——Vue 3 reactive Map 的 get
   * 只追踪该 key，其他 key 的 set 不触发本 computed 重算。
   *
   * 这就是「坦克履带」精准响应式的关键：每次滚动只有 1 个 panelId 的 pageIdx 真变化，
   * 对应那一格 SkeletonPanel 才 re-render，其余 SkeletonPanel 完全不受影响。
   */
  pageIdxMap: Map<number, number>
  /** 单页块高度（含分割条 + 表头 + pageSize 行）。父组件按 pageBlockHeight 计算确定值 */
  pageBlockHeight: number
  /** 分割条高度（与 InfinitePagesImpl 的 DIVIDER_HEIGHT 保持一致） */
  dividerHeight: number
  /** 表头高度（vxe-grid 默认行高，与 ROW_HEIGHT 一致） */
  headerHeight: number
  /** 单行高度 */
  rowHeight: number
  /** 每页行数 */
  pageSize: number
}

const props = defineProps<Props>()

/**
 * 本面板当前显示的页号：从父组件传入的 reactive Map 中读自己的 entry。
 *
 * 设计缘由：让响应式追踪发生在子组件内部——只有 map.set(本 panelId, 新值) 才会触发
 * 本 computed 重算，map.set(其他 panelId, ...) 不影响本面板。这就是「坦克履带」
 * 精准响应式的关键：滚动时只 1 个 panelId 真变，对应那一格 SkeletonPanel 才重渲染。
 *
 * ?? -1 兜底：Map 初始化或异常时 entry 可能缺失，越界值（< 0 或 ≥ totalPages）
 * 由父组件显式写入 -1，模板里 pageIdx+1=0 时分割条显示「第 0 页」，无意义但
 * 不影响视觉——越界面板位于视口外，用户看不到。
 */
const pageIdx = computed(() => props.pageIdxMap.get(props.panelId) ?? -1)

/**
 * 列规格：与 vxe-grid 列定义（buildMeetHrColumns）保持一致。
 * - 固定宽列：checkbox / seq / createTime / lastVisitTime（用 FIXED_COLUMN_WIDTHS 单一来源）
 * - flex 列：5 个文本列用 flex:1 平均分配剩余宽度（与 FLEX_COLUMN_COUNT 一致）
 *
 * 这样骨架列宽与 vxe-grid 实际列宽视觉对齐——用户从骨架过渡到真实数据时，
 * 每列宽度都恰好一致，没有「跳一下」的视觉抖动。
 */
interface ColumnSpec {
  /** 固定宽度（px）。与 flex 互斥 */
  width?: number
  /** flex 权重（默认 1）。与 width 互斥 */
  flex?: number
}

const columnSpecs: ColumnSpec[] = [
  { width: FIXED_COLUMN_WIDTHS.checkbox },
  { width: FIXED_COLUMN_WIDTHS.seq },
  // 5 个文本列：用 spread 等会创建新数组违反编码规范，用 push 循环构造
  ...Array.from({ length: FLEX_COLUMN_COUNT }, () => ({ flex: 1 })),
  { width: FIXED_COLUMN_WIDTHS.createTime },
  { width: FIXED_COLUMN_WIDTHS.lastVisitTime },
]

/**
 * 把 ColumnSpec 转成 inline style 对象，让模板里的 v-for 直接绑定。
 * width 优先（固定宽度列），否则按 flex 权重。
 */
function colStyle(col: ColumnSpec): Record<string, string> {
  if (col.width !== void 0) {
    return { width: `${col.width}px`, flex: '0 0 auto' }
  }
  return { flex: String(col.flex ?? 1) }
}
</script>

<template>
  <div
    :class="$style.panel"
    :style="{
      transform: `translateY(${pageIdx * props.pageBlockHeight}px)`,
      height: `${props.pageBlockHeight}px`,
    }"
  >
    <!-- 分割条：实心蓝底白字，与 InfinitePagesImpl 的 pageDivider 风格统一，
         让用户在滚动时一眼看到「现在到了第几页」 -->
    <div :class="$style.divider" :style="{ height: `${props.dividerHeight}px` }">
      <span :class="$style.dividerText">第 {{ pageIdx + 1 }} 页</span>
    </div>

    <!-- 表头骨架：高 headerHeight 的浅灰条，内含每列一个略深的灰块模拟表头文字 -->
    <div :class="$style.headerRow" :style="{ height: `${props.headerHeight}px` }">
      <div
        v-for="(col, i) in columnSpecs"
        :key="`h-${i}`"
        :class="$style.headerCell"
        :style="colStyle(col)"
      />
    </div>

    <!-- 数据行骨架：pageSize 行 × columnSpecs 列 = 浅灰底 + 灰色长条模拟文本 -->
    <div
      v-for="rowIdx in props.pageSize"
      :key="`r-${rowIdx - 1}`"
      :class="$style.skeletonRow"
      :style="{ height: `${props.rowHeight}px` }"
    >
      <div
        v-for="(col, i) in columnSpecs"
        :key="`c-${i}`"
        :class="$style.skeletonCell"
        :style="colStyle(col)"
      >
        <div :class="$style.skeletonBar" />
      </div>
    </div>
  </div>
</template>

<style module>
/* 骨架面板：absolute 定位 + transform 平移
 * - position: absolute 让面板层叠在 spacer 内
 * - left/right:0 width:100% 占满横向
 * - transform: translateY(...) 性能关键——只触发合成（compositor），
 *   不触发布局（layout）和绘制（paint），是「闪电响应」的根基
 * - will-change: transform 让浏览器把面板提升到独立 layer，进一步优化 */
.panel {
  position: absolute;
  left: 0;
  right: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  will-change: transform;
  /* 骨架层在数据层下方：z-index 1 */
  z-index: 1;
  pointer-events: none;
  background: #fff;
}

/* 分割条：与 InfinitePagesImpl 的 pageDivider 视觉一致，让两层架构的 UI 风格统一 */
.divider {
  background: linear-gradient(90deg, #1890ff 0%, #409eff 50%, #1890ff 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.3);
}

.dividerText {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 3px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* 表头骨架行：浅灰底，每个 cell 用更深的灰块占位 */
.headerRow {
  display: flex;
  align-items: stretch;
  background: #fafafa;
  border-bottom: 1px solid #ebeef5;
  box-sizing: border-box;
}

.headerCell {
  box-sizing: border-box;
  border-right: 1px solid #ebeef5;
  padding: 8px 12px;
  background: #f0f2f5;
}

.headerCell:last-child {
  border-right: none;
}

/* 数据行骨架 */
.skeletonRow {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid #f5f5f5;
  box-sizing: border-box;
}

.skeletonCell {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  box-sizing: border-box;
  border-right: 1px solid #f5f5f5;
}

.skeletonCell:last-child {
  border-right: none;
}

/* 灰色长条模拟文本：动画 shimmer 让骨架有「正在加载」的动感，
 * 缓和用户等待焦虑（软件心理学） */
.skeletonBar {
  width: 70%;
  height: 14px;
  border-radius: 3px;
  background: linear-gradient(90deg, #e8e8e8 0%, #f5f5f5 50%, #e8e8e8 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>

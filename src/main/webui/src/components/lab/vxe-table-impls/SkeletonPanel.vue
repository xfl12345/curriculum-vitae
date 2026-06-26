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

interface Props {
  /** 面板固定 ID（仅用于 v-for key，永不变化） */
  panelId: number
  /**
   * 本面板显示的页号（0-based）。
   *
   * 父组件用一个简单 computed 数组按「整体平移」生成 pageIdxs：
   *   pageIdxs[panelId] = firstVisible - buffer + panelId
   * 每次 firstVisible ±1，所有 panelCount 个面板的 pageIdx 都 ±1，全部重渲染。
   *
   * 为什么骨架层不用数据层的「坦克履带」精准响应式？
   * - 骨架面板只是「分割条文字 + shimmer 占位行」，重渲染 = 改一个 div 的 transform + text，
   *   compositor-only 操作，sub-ms 开销，panelCount 个同时重渲染无感
   * - 数据层（vxe-grid）重渲染才贵（calcCellHeight 重 reflow 几十毫秒），才需要坦克履带
   * - 给骨架层也上坦克履带是过度设计
   */
  pageIdx: number
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
  /**
   * 列宽 class 字符串数组（由父组件 useCssModule() 取出后传入）。
   *
   * 每项是一个已 hash 的 CSS class 字符串，模板里 :class="[$style.headerCell, colClass]"
   * 同时应用骨架 cell 的本组件样式（边框/padding）+ 父组件的列宽样式（width/flex）。
   *
   * 为什么从父组件传入而非本组件自定义：
   * - 列宽是「表格布局策略」，父组件是单一来源，便于和 vxe-grid 数据层列宽同步
   * - CSS module 的 class 是 hash 后的全局唯一名字，传字符串给子组件用是合法且类型安全的
   * - 改列宽只改父组件 <style module> 一处，无需同步多个子组件
   */
  columnClasses: string[]
}

const props = defineProps<Props>()

const panelTransform = computed(() => `translateY(${props.pageIdx * props.pageBlockHeight}px)`)
</script>

<template>
  <div :class="$style.panel">
    <!-- 分割条：实心蓝底白字，与 InfinitePagesImpl 的 pageDivider 风格统一，
         让用户在滚动时一眼看到「现在到了第几页」 -->
    <div :class="$style.divider">
      <span :class="$style.dividerText">第 {{ pageIdx + 1 }} 页</span>
    </div>

    <!-- 表头骨架：高 headerHeight 的浅灰条，内含每列一个略深的灰块模拟表头文字 -->
    <div :class="$style.headerRow">
      <div v-for="(colClass, i) in columnClasses" :key="`h-${i}`" :class="[$style.headerCell, colClass]" />
    </div>

    <!-- 数据行骨架：pageSize 行 × columnClasses 列 = 浅灰底 + 灰色长条模拟文本 -->
    <div v-for="rowIdx in pageSize" :key="`r-${rowIdx - 1}`" :class="$style.skeletonRow">
      <div v-for="(colClass, i) in columnClasses" :key="`c-${i}`" :class="[$style.skeletonCell, colClass]">
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
  transform: v-bind(panelTransform);
  height: calc(v-bind('pageBlockHeight') * 1px);
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
  height: calc(v-bind('dividerHeight') * 1px);
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
  height: calc(v-bind('headerHeight') * 1px);
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
  height: calc(v-bind('rowHeight') * 1px);
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

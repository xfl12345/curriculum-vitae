<script setup lang="ts">
/**
 * 骨架面板（SkeletonPanel）—— 全量静态渲染的「即时响应层」。
 *
 * 角色（两层架构中的底层，z-index: 1）：
 * - 父组件一次性渲染 totalPages 个 SkeletonPanel，每个面板对应**固定**页号
 * - pageIdx 永不变化，transform 是静态的——零 JS 滚动 handler 开销
 * - content-visibility: auto + contain-intrinsic-block-size 让浏览器自身剔除
 *   屏幕外面板的 layout/paint，骨架层自然跟随滚动条
 * - 显示「第 X 页」分割条 + 列形骨架（表头 + pageSize 行）
 * - 视觉上强烈反馈「现在滚动到了第几页」，避免数据未加载时的空白感
 *
 * 与数据层（DataPanel）的分工：
 * - IN_RANGE：数据层（z-index 2，不透明白底）覆盖在骨架层之上，用户看到真实数据
 * - OUT_OF_RANGE：数据层冻结在旧 pageIdx（旧位置通常已滚出视口），用户在新位置看到
 *   骨架层的分割条 + shimmer 占位（骨架层因为全量渲染，新位置本来就有面板等着）
 * - 两层各自位于自己的 translateY 位置，骨架层的全量面板与数据层的 tank tread 面板
 *   永不重叠（z-index 决定层叠），各自渲染分割条不会出现"双分割条"——骨架层在下方，
 *   数据层不透明白底完全盖住对应位置的骨架层
 *
 * 与早期 tank tread 架构的本质差异：
 * - 旧：panelCount 个面板按滚动切换 pageIdx（tank tread / 整体平移），JS 驱动响应
 * - 新：totalPages 个面板各自静态渲染（pageIdx 永不变），浏览器原生 visibility 剔除
 *
 * 为什么可以全量渲染（早期为什么不敢）：
 * - 骨架面板是纯 CSS 渲染（divider + 静态灰条），没有 vxe-grid 的 calcCellHeight 等
 *   reflow 开销；浏览器 layout 单页骨架 sub-ms
 * - content-visibility: auto 是浏览器原生优化，屏幕外面板完全不进 paint 阶段，
 *   即使 totalPages=10000 也不会卡（浏览器厂商测试到 100k 元素级别）
 * - 内存：DOM 节点存在但不渲染，Chrome 内部对 skipped 子树有内存优化
 *
 * 设计缘由：软件心理学——UI 必须以闪电般的速度响应用户输入，渐进式加载可以接受。
 * 骨架层是「闪电响应」（现在更是零延迟——它本来就在那），数据层是「渐进加载」。
 */

import { computed } from 'vue'

interface Props {
  /**
   * 本面板固定显示的页号（0-based）。
   *
   * 全量静态渲染：父组件 v-for 渲染 totalPages 个面板，每个面板的 pageIdx
   * 等于它在 v-for 中的索引，永不变化。translateY 由 pageIdx × pageBlockHeight
   * 一次计算后固定，pageBlockHeight 仅在 pageSize 变化时改变（低频）。
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
/* 骨架面板：absolute 定位 + 静态 transform 平移
 * - position: absolute 让面板层叠在 spacer 内
 * - left/right:0 width:100% 占满横向
 * - transform: translateY(...) **静态**——pageIdx 永不变，transform 永不变，
 *   不再需要 will-change: transform（早期 tank tread 架构才需要）
 *
 * content-visibility: auto + contain-intrinsic-block-size（核心优化）：
 * - 浏览器自身判断面板是否在视口附近，远离视口时跳过 layout/paint
 * - contain-intrinsic-block-size 提供面板高度，让浏览器在跳过 layout 时
 *   仍知道面板尺寸（避免尺寸塌陷影响其他计算）
 * - 这是「全量静态渲染 + 浏览器原生 visibility 剔除」方案的根基——
 *   totalPages 个面板 DOM 存在，但只有视口附近的几个真正进入 paint 阶段
 * - 浏览器支持：Chrome 85+/Edge 85+/Safari 17.4+/Firefox 125+ */
.panel {
  position: absolute;
  left: 0;
  right: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  content-visibility: auto;
  contain-intrinsic-block-size: calc(v-bind('pageBlockHeight') * 1px);
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

/* 灰色长条模拟文本：静态灰条作为「文本占位」。
 *
 * shimmer 动画由父组件 InfiniteTransformTrickImpl.vue 的 .shimmerOverlay 全局提供——
 * 把 per-cell background-position 动画（O(rows × cols) 节点）改为单一 transform 动画
 * （O(1) 节点），让骨架层的 CPU 消耗与表格规模彻底解耦。
 * 详见父组件 .shimmerOverlay 注释。 */
.skeletonBar {
  width: 70%;
  height: 14px;
  border-radius: 3px;
  background: #e8e8e8;
}
</style>

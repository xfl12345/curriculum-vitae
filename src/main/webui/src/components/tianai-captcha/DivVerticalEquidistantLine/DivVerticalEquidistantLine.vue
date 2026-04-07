<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

import type { Props } from './types'

const props = withDefaults(defineProps<Props>(), {
  boxWidthInPixel: 22,
  boxHeightInPixel: 22,
  count: 3,
  deepInPixel: -1,
  useDefaultShadowStyle: true,
  round: true,
})

// 容器尺寸
const boxWidth = computed(() => props.boxWidthInPixel + 'px')
const boxHeight = computed(() => props.boxHeightInPixel + 'px')

// 黄金比例计算线条宽度
const verticalMarginInPixel = computed(() => props.boxWidthInPixel / (1.618 * props.count - 1))
const pictureWidthInPixel = computed(() => Math.ceil(verticalMarginInPixel.value * 0.618))
const pictureWidth = computed(() => pictureWidthInPixel.value + 'px')

// 默认阴影样式（内凹阴影）
const defaultShadowStyle = computed<CSSProperties['box-shadow']>(() => {
  const deep = props.deepInPixel < 0 ? pictureWidthInPixel.value * (1 - 0.618) : props.deepInPixel
  const spreadWidth = deep / Math.tan((72 / 180) * Math.PI)
  return `0 0 ${pictureWidthInPixel.value / 4}px ${spreadWidth}px #999999 inset`
})

// 合并背景色和用户自定义样式
const borderRadius = computed<CSSProperties['border-radius']>(() =>
  props.round ? pictureWidth.value : '0'
)

// 条件性使用阴影
const boxShadow = computed<CSSProperties['box-shadow']>(() =>
  props.useDefaultShadowStyle ? defaultShadowStyle.value : 'none'
)
</script>

<template>
  <div ref="templateRoot" :class="$style.root">
    <div v-for="i in count" :key="i" :class="$style.line"></div>
  </div>
</template>

<style module>
.root {
  display: flex;
  justify-content: space-between;
  width: v-bind(boxWidth);
  height: v-bind(boxHeight);
}

.line {
  height: 100%;
  width: v-bind(pictureWidth);
  background-color: #03de00;
  border-radius: v-bind(borderRadius);
  box-shadow: v-bind(boxShadow);
}
</style>

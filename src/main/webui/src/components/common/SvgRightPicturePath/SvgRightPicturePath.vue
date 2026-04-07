<script setup lang="ts">
import { computed, onMounted, ref, type CSSProperties } from 'vue'

import type { Props } from './types'

const props = withDefaults(defineProps<Props>(), {
  offsetX: 0,
  offsetY: 0,
  delayShowPictureInMs: 100,
})

interface Point {
  x: number
  y: number
}

const points = computed<{ start: Point; breakPoint: Point; end: Point }>(() => {
  const offsetHeight = props.height + props.offsetY
  const offsetWidth = props.width + props.offsetX
  const startY = offsetHeight * 0.618
  return {
    start: { x: props.offsetX, y: startY },
    breakPoint: { x: offsetHeight - startY, y: offsetHeight },
    end: { x: offsetWidth, y: props.offsetY },
  }
})

function point2string(p: Point): string {
  return p.x + ' ' + p.y
}
const thePathString = computed(
  () =>
    `M${point2string(points.value.start)} ${point2string(points.value.breakPoint)} ${point2string(points.value.end)}`
)

function calcPointDistance(a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}
const strokeDasharrayInPixel = computed(
  () =>
    calcPointDistance(points.value.start, points.value.breakPoint) +
    calcPointDistance(points.value.end, points.value.breakPoint) +
    2
)

const isShowPic = ref((props.delayShowPictureInMs ?? 0) === 0)
const dynamicStyle = computed<CSSProperties>(() => ({
  strokeDashoffset: isShowPic.value ? '0' : '' + strokeDasharrayInPixel.value,
  strokeDasharray: '' + strokeDasharrayInPixel.value,
}))

onMounted(() => {
  if (!isShowPic.value) {
    setTimeout(() => {
      isShowPic.value = true
    }, props.delayShowPictureInMs)
  }
})
</script>

<template>
  <path ref="templateRoot" :class="$style.root" :d="thePathString" />
</template>

<style module>
.root {
  fill: transparent;
  stroke-width: 2px;
  stroke: black;
  transition-duration: 0.5s;
  stroke-dashoffset: v-bind('dynamicStyle.strokeDashoffset');
  stroke-dasharray: v-bind('dynamicStyle.strokeDasharray');
}
</style>

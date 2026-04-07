<script setup lang="ts">
import { computed, watch, type CSSProperties } from 'vue'

import type { Emits, Props } from './types'

const props = withDefaults(defineProps<Props>(), {
  sizingType: 'border',
  domSquareBoxWidth: 104,
  propsRadius: 49,
  colorFilled: () => [
    '#ff0000',
    '#ff2600',
    '#ff4d00',
    '#ff7300',
    '#ff9900',
    '#ffbf00',
    '#ffe500',
    '#f2ff00',
    '#ccff00',
    '#a6ff00',
    '#80ff00',
    '#59ff00',
    '#33ff00',
    '#0dff00',
    '#00ff19',
    '#00ff40',
    '#00ff66',
    '#00ff8c',
    '#00ffb3',
    '#00ffd9',
    '#00ffff',
  ],
  colorUnfilled: '#3BB44A',
  isShowPercentage: true,
  rounded: true,
  transitionDurationInSeconds: 0.5,
  strokeWidthInPixel: 6,
})

const percentage = computed(() => Math.floor((props.progress / props.progressMax) * 100))
const boxWidthInPixel = computed(() => {
  switch (props.sizingType) {
    case 'content':
      return props.propsRadius! * 2 + props.strokeWidthInPixel
    case 'border':
    default:
      return props.domSquareBoxWidth
  }
})
const borderRadius = computed(() => boxWidthInPixel.value + 'px')

const radius = computed(() => {
  switch (props.sizingType) {
    case 'content':
      return props.propsRadius
    case 'border':
    default:
      return boxWidthInPixel.value / 2 - props.strokeWidthInPixel * 0.5
  }
})
const dashArray = computed(() => radius.value * Math.PI * 2)

const isLimitReached = computed(() => props.progressMax <= props.progress)
const strokeColor = computed(() => {
  if (isLimitReached.value) {
    return props.colorFilled[props.colorFilled.length - 1]!
  }
  const index = Math.floor((props.progress / props.progressMax) * (props.colorFilled.length - 1))
  return props.colorFilled[index]!
})
const currentFormatted = computed(() => (isLimitReached.value ? props.progressMax : props.progress))
const dashOffset = computed(
  () => dashArray.value - (dashArray.value * currentFormatted.value) / props.progressMax
)

const strokeWidth = computed(() => props.strokeWidthInPixel + 'px')
const centerOffset = computed(() => boxWidthInPixel.value / 2)
const fillingCircleStyle = computed<CSSProperties>(() => ({
  stroke: strokeColor.value,
  strokeWidth: strokeWidth.value,
  strokeDashoffset: dashOffset.value + '',
  strokeDasharray: dashArray.value + '',
  strokeLinecap: props.rounded ? 'round' : 'initial',
  transitionDuration: props.transitionDurationInSeconds + 's',
  transformOrigin: `${centerOffset.value}px ${centerOffset.value}px`,
}))

const innerBoxWidthInPixel = computed(() => radius.value * 2 - props.strokeWidthInPixel)
const innerBoxWidth = computed(() => innerBoxWidthInPixel.value + 'px')
const innerBoxBorder = computed(() => {
  const halfStrokeWidthInPixel = props.strokeWidthInPixel / 6
  const borderWidth = halfStrokeWidthInPixel >= 1 ? halfStrokeWidthInPixel : 1
  return `${borderWidth}px solid ${strokeColor.value}`
})
const percentageTextFontSize = computed(() => innerBoxWidthInPixel.value / 5 + 'px')

const emit = defineEmits<Emits>()
watch(isLimitReached, (newValue, oldValue) => {
  if (newValue !== oldValue) {
    emit('reached', newValue)
  }
})
</script>

<template>
  <div ref="templateRoot" :class="$style.box">
    <svg
      :width="boxWidthInPixel"
      :height="boxWidthInPixel"
      :viewBox="`0 0 ${boxWidthInPixel} ${boxWidthInPixel}`"
    >
      <circle :class="$style.track" :r="radius" :cx="centerOffset" :cy="centerOffset" />
      <circle
        ref="fillingCircle"
        :class="$style.filling"
        :r="radius"
        :cx="centerOffset"
        :cy="centerOffset"
      />
    </svg>

    <div v-if="isShowPercentage" :class="[$style.innerBox, innerBoxClass]">
      <slot
        :percentage="percentage"
        :inner-box-width-in-pixel="innerBoxWidthInPixel"
        :is-limit-reached="isLimitReached"
      >
        <div :class="$style.defaultContent">
          <div :class="$style.defaultText">
            <span :class="$style.percentageText">
              {{ percentage + '%' }}
            </span>
          </div>
        </div>
      </slot>
    </div>
  </div>
</template>

<style module>
.box {
  display: inline-block;
  vertical-align: middle;
  position: relative;
  overflow: hidden;
  border-radius: v-bind(borderRadius);
}

.track {
  fill: transparent;
  stroke: #eceef1;
  stroke-dashoffset: 0;
  stroke-width: v-bind(strokeWidth);
}

.filling {
  fill: transparent;
  animation-timing-function: ease-in;
  transform: rotate(-90deg);
  stroke: v-bind('fillingCircleStyle.stroke');
  stroke-width: v-bind('fillingCircleStyle.strokeWidth');
  stroke-dashoffset: v-bind('fillingCircleStyle.strokeDashoffset');
  stroke-dasharray: v-bind('fillingCircleStyle.strokeDasharray');
  stroke-linecap: v-bind('fillingCircleStyle.strokeLinecap');
  transition-duration: v-bind('fillingCircleStyle.transitionDuration');
  transform-origin: v-bind('fillingCircleStyle.transformOrigin');
}

.innerBox {
  position: absolute;
  overflow: hidden;
  box-sizing: border-box;
  border-radius: 100%;
  width: v-bind(innerBoxWidth);
  height: v-bind(innerBoxWidth);
  top: v-bind(strokeWidth);
  left: v-bind(strokeWidth);
  border: v-bind(innerBoxBorder);
}

.defaultContent {
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
}

.defaultText {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.percentageText {
  font-size: v-bind(percentageTextFontSize);
}
</style>

<script setup lang="ts">
import tinygradient from 'tinygradient'
import { computed, ref } from 'vue'

import { CenterBox } from '@/components/common'

import type { Props } from './types'

const templateRoot = ref<HTMLDivElement>()

const props = withDefaults(defineProps<Props>(), {
  theFontSizeInPixel: 24,
  thePercent: 0.8,
  theBorderColor: 'auto',
  progressBarColorArray: () =>
    tinygradient('red', 'aqua')
      .hsv(100, 'long')
      .map((item) => item.toHexString()),
  showPercentNumber: false,
  percentNumber2Fixed: 0,
})

const theFontSize = computed(() => props.theFontSizeInPixel + 'px')
/**
 * 获取进度条颜色
 */
const theContentColor = computed(() => {
  const arr = props.progressBarColorArray
  const index = Math.round((arr.length - 1) * props.thePercent)
  if (index < 0) {
    return arr.at(0)!
  }

  if (index >= arr.length) {
    return arr.at(-1)!
  }

  return arr[index]
})
const borderColor = computed(() =>
  props.theBorderColor === 'auto' ? theContentColor.value : props.theBorderColor
)
const percentText = computed(() => (props.thePercent * 100).toFixed(props.percentNumber2Fixed) + '%')
</script>

<template>
  <div ref="templateRoot" :class="$style.root">
    <div :class="$style.fill" />
    <CenterBox v-if="showPercentNumber" :class="$style.percentOverlay">
      <span :class="[$style.percentText, percentNumberClass]">{{ percentText }}</span>
    </CenterBox>
  </div>
</template>

<style module>
.root {
  box-sizing: border-box;
  border-style: solid;
  border-width: 2px;
  overflow: hidden;
  background-color: transparent;
  position: relative;
  border-radius: v-bind(theFontSize);
  border-color: v-bind(borderColor);
  height: v-bind(theFontSize);
  clip-path: inset(0 round calc(v-bind(theFontSizeInPixel) * 1px));
}
.fill {
  height: 120%;
  margin: 0;
  width: calc(v-bind(thePercent) * 100 * 1%);
  background-color: v-bind(theContentColor);
}
.percentOverlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}
.percentText {
  font-size: v-bind(theFontSize);
}
</style>

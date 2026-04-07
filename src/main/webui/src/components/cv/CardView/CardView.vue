<script setup lang="ts">
import { computed } from 'vue'

import type { Props } from './types'

const props = withDefaults(defineProps<Props>(), {
  theFontSizeInPixel: 24,
  theBackgroundColor: 'rgb(173, 216, 230)',
})

const quarterFontSizeInPixel = computed(() => Math.floor(props.theFontSizeInPixel / 4))
const oneEighthFontSizeInPixel = computed(() => Math.floor(quarterFontSizeInPixel.value / 2))

const quarterFontSize = computed(() => quarterFontSizeInPixel.value + 'px')
const oneEighthFontSize = computed(() => oneEighthFontSizeInPixel.value + 'px')
const rootMargin = computed(() =>
  [
    oneEighthFontSize.value,
    quarterFontSize.value,
    quarterFontSize.value,
    quarterFontSize.value,
  ].join(' ')
)
const boxShadow = computed(() => {
  const fSize = oneEighthFontSize.value
  return [fSize, fSize, fSize, '0', 'gray'].join(' ')
})
</script>

<template>
  <div ref="templateRoot" :class="$style.root">
    <div :class="$style.card">
      <slot></slot>
    </div>
  </div>
</template>

<style module>
.root {
  margin: v-bind(rootMargin);
  font-size: calc(v-bind(theFontSizeInPixel) * 1px);
}
.card {
  box-shadow: v-bind(boxShadow);
  background-color: v-bind(theBackgroundColor);
  border: 1px solid v-bind(theBackgroundColor);
  border-radius: calc(v-bind(quarterFontSizeInPixel) * 1px);
  filter: invert(0);
}
.card:hover {
  filter: invert(100);
}
</style>

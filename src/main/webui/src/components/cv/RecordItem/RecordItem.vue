<script setup lang="ts">
import { ref } from 'vue'

import { CardView } from '@/components/cv/CardView'
import { TextPrettier } from '@/components/cv/TextPrettier'

import type { Props } from './types'

const templateRoot = ref<HTMLDivElement>()

withDefaults(defineProps<Props>(), {
  theFontSizeInPixel: 24,
  thePeriod: '',
  theHeaderCenter: '',
  theHeaderRight: '',
  theBody: '',
})
</script>

<template>
  <CardView
    ref="templateRoot"
    :the-font-size-in-pixel="theFontSizeInPixel"
    the-background-color="paleturquoise"
    :class="$style.root"
  >
    <div :class="$style.header">
      <TextPrettier :class="$style.headerItem" :content="thePeriod" />
      <TextPrettier :class="$style.headerItem" :content="theHeaderCenter" />
      <TextPrettier :class="$style.headerItem" :content="theHeaderRight" />
    </div>
    <TextPrettier :class="$style.fullWidth" :content="theBody" />
  </CardView>
</template>

<style module>
.root {
  font-size: calc(v-bind(theFontSizeInPixel) * 1px);
}
.header {
  width: 100%;
  display: flex;
  box-sizing: border-box;
  justify-content: space-between;
}
.headerItem {
  margin: 0 calc(v-bind(theFontSizeInPixel) * 1px);
  white-space: nowrap;
}
.fullWidth {
  width: 100%;
}
</style>

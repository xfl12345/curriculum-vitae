<script setup lang="ts">
import { ref } from 'vue'

import { CardView } from '@/components/cv/CardView'
import { TextPrettier } from '@/components/cv/TextPrettier'

import type { Props } from './types'

const templateRoot = ref<HTMLDivElement>()

withDefaults(defineProps<Props>(), {
  theFontSizeInPixel: 24,
  thePeriod: '',
  theName: '',
  theTechnologyStack: '',
  theBody: '',
})
</script>

<template>
  <CardView
    ref="templateRoot"
    :the-font-size-in-pixel="theFontSizeInPixel"
    the-background-color="greenyellow"
  >
    <div :class="$style.header">
      <TextPrettier :class="$style.headerItem" :content="thePeriod" />
      <TextPrettier :class="$style.headerItem" :content="theName" />
    </div>
    <div :class="$style.fullWidth">
      <TextPrettier :content="theTechnologyStack" />
    </div>
    <div :class="$style.fullWidth">
      <TextPrettier :content="theBody" />
    </div>
  </CardView>
</template>

<style module>
.header {
  width: 100%;
  display: flex;
  box-sizing: border-box;
  justify-content: space-between;
  font-size: calc(v-bind(theFontSizeInPixel) * 1px);
}
.headerItem {
  margin: 0 calc(v-bind(theFontSizeInPixel) * 1px);
  white-space: nowrap;
}
.fullWidth {
  width: 100%;
}
</style>

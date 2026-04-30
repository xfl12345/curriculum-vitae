<script setup lang="ts">
import { computed } from 'vue'

import { TextPrettier } from '@/components/cv/TextPrettier'

import type { Props } from './types'

const props = withDefaults(defineProps<Props>(), {
  theFontSizeInPixel: 24,
  theUrl: '',
  useFontSizeAsHeight: false,
})

const theFontSize = computed(() => props.theFontSizeInPixel + 'px')
const iconFontSize = computed(() => Math.floor(props.theFontSizeInPixel * 0.5) + 'px')
</script>

<template>
  <div :class="[$style.root, { [$style.sizedHeight]: useFontSizeAsHeight }]">
    <span :class="$style.icon">💥</span>
    <a :class="$style.link" :href="theUrl" target="_blank" rel="noopener noreferrer">
      <TextPrettier :content="theUrl" :foxy-text-class="$style.textPrettier" />
    </a>
  </div>
</template>

<style module>
.root {
  display: block;
  box-sizing: border-box;
  white-space: nowrap;
  font-size: v-bind(theFontSize);
}
.sizedHeight {
  height: v-bind(theFontSize);
  line-height: v-bind(theFontSize);
}
.icon {
  vertical-align: middle;
  padding: 0 calc(v-bind(theFontSizeInPixel) / 4 * 1px);
  font-size: v-bind(iconFontSize);
}
.link {
  display: inline;
  text-decoration: none;
  vertical-align: inherit;
  font-size: inherit;
  color: blue;
}
.link:visited {
  color: blue;
  text-decoration: none;
}
.link:hover {
  color: hotpink;
  text-decoration: none;
}
.link:active {
  color: blue;
  text-decoration: none;
}
.textPrettier {
  vertical-align: inherit;
  line-height: inherit;
  font-size: inherit;
}
</style>

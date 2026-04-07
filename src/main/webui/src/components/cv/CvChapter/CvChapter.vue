<script setup lang="ts">
import { computed } from 'vue'

import { CenterBox } from '@/components/common'
import { TextPrettier } from '@/components/cv/TextPrettier'

import type { Props } from './types'

const props = withDefaults(defineProps<Props>(), {
  theFontSizeInPixel: 24,
  theTitle: '',
  theSlogan: '',
})

const titleFontSize = computed(() => props.theFontSizeInPixel * 1.25 + 'px')
</script>

<template>
  <div :class="$style.root">
    <div :class="$style.header">
      <div :class="$style.titleBar">
        <CenterBox>
          <TextPrettier :class="$style.nowrap" :content="theTitle" />
        </CenterBox>
      </div>
      <div :class="$style.sloganBar">
        <slot name="slogan">
          <CenterBox>
            <TextPrettier :class="$style.nowrapTop" :content="theSlogan" />
          </CenterBox>
        </slot>
      </div>
    </div>
    <div :class="$style.content">
      <slot></slot>
    </div>
  </div>
</template>

<style module>
.root {
  width: 100%;
}
.header {
  width: 100%;
  display: flex;
  height: calc(v-bind(theFontSizeInPixel) * 1.5 * 1px);
}
.titleBar {
  flex: 236076;
  background-color: #2d69bc;
  color: white;
  text-align: center;
  font-size: v-bind(titleFontSize);
}
.sloganBar {
  flex: 763924;
  background-color: #99beeb;
  font-size: v-bind(titleFontSize);
}
.nowrap {
  white-space: nowrap;
}
.nowrapTop {
  white-space: nowrap;
  vertical-align: top;
}
.content {
  width: 100%;
}
</style>

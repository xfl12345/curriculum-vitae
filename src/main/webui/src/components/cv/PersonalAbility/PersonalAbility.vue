<script setup lang="ts">
import { computed } from 'vue'

import { RainbowProgressBar } from '@/components/cv/RainbowProgressBar'
import { TextPrettier } from '@/components/cv/TextPrettier'

import type { Props } from './types'

const props = withDefaults(defineProps<Props>(), {
  theFontSizeInPixel: 24,
  skillDegreeList: () => [],
})

const theLineHeight = computed(() => Math.ceil(props.theFontSizeInPixel * 1.25) + 'px')
const quarterFontSize = computed(() => Math.floor(props.theFontSizeInPixel / 4) + 'px')
</script>

<template>
  <div :class="$style.root">
    <div v-for="degreeItem in skillDegreeList" :key="degreeItem.skillName" :class="$style.row">
      <div :class="$style.barCell">
        <div :class="$style.barCellInner">
          <RainbowProgressBar
            :the-font-size-in-pixel="theFontSizeInPixel"
            :the-percent="degreeItem.degree"
            :class="$style.progressBarInline"
          />
        </div>
      </div>
      <div :class="$style.nameCell">
        <TextPrettier :content="degreeItem.skillName" :class="$style.nameText" />
      </div>
    </div>
  </div>
</template>

<style module>
.root {
  width: 100%;
  display: table;
  font-size: calc(v-bind(theFontSizeInPixel) * 1px);
  line-height: v-bind(theLineHeight);
}
.row {
  display: table-row;
  width: 100%;
}
.barCell {
  display: table-cell;
  width: 61.8%;
}
.barCellInner {
  padding: 0 v-bind(quarterFontSize);
}
.nameCell {
  display: table-cell;
}
.nameText {
  white-space: nowrap;
  padding: 0 v-bind(quarterFontSize);
}
.progressBarInline {
  display: inline-block;
  vertical-align: text-bottom;
  width: 100%;
}
</style>

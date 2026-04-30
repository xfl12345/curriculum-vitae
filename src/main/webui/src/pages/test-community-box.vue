<script setup lang="ts">
import cvDataUrl from '/mock/cv-data.json?url&no-inline'
import { nextTick, ref } from 'vue'

import type { CommunityData, CurriculumVitaeData } from '@/model/business'

import { CommunityBox } from '@/components/cv/CommunityBox'

const theFontSizeInPixel = ref(24)

const shouldRender = ref(true)
function remount() {
  shouldRender.value = false
  nextTick(() => {
    shouldRender.value = true
  })
}

const community = ref<CommunityData>()
fetch(cvDataUrl)
  .then((res) => res.json())
  .then((data: CurriculumVitaeData) => {
    community.value = data.community
  })
</script>

<template>
  <div :class="$style.page">
    <div :class="$style.controls">
      <label>
        fontSize: <input v-model.number="theFontSizeInPixel" type="range" min="12" max="48" step="1" />
        {{ theFontSizeInPixel }}px
      </label>
      <button type="button" @click="remount">Remount</button>
    </div>
    <div v-if="shouldRender" :class="$style.preview">
      <CommunityBox :the-font-size-in-pixel="theFontSizeInPixel" :community="community" />
    </div>
  </div>
</template>

<style module>
.page {
  padding: 16px;
}

.controls {
  padding: 8px;
  border: 1px dashed aqua;
  margin-bottom: 16px;
  color: aqua;
  font-size: 14px;
}

.preview {
  border: 1px dashed hotpink;
  padding: 16px;
}
</style>

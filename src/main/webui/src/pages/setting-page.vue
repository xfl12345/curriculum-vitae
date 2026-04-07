<script setup lang="ts">
import { NSwitch } from 'naive-ui'
import { toRefs } from 'vue'

import { CenterBox } from '@/components'
import { useSettingsStore } from '@/stores/settings'

const { devMode, persistDevMode } = toRefs(useSettingsStore())
</script>

<template>
  <CenterBox y-grow="1" x-basis="800px">
    <div :class="$style.main">
      <div :class="$style.row">
        <span>记住调试状态</span>
        <NSwitch v-model:value="persistDevMode" />
      </div>
      <div :class="$style.row">
        <span>开发者模式</span>
        <NSwitch v-model:value="devMode" />
      </div>
    </div>
  </CenterBox>
</template>

<style module>
.main {
  display: flex;
  flex-direction: column;
  font-size: xx-large;
}

.row {
  display: flex;
  white-space: nowrap;
  align-items: center;
  gap: 1em;
}
</style>

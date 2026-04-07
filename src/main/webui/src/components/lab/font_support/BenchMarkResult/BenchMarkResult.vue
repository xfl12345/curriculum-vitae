<script setup lang="ts">
import type { Props } from './types'

defineProps<Props>()
</script>

<template>
  <div :class="$style.root">
    [{{ algorithmName }}] error:
    <span :class="isError ? $style.fail : $style.pass">{{ isError }}</span>
    , result:
    <span :class="isSupported ? $style.pass : $style.fail">{{ isSupported }}</span>
    , elapsed time:
    <span :class="$style.time">{{ elapsedTimeInMicroseconds }}ms</span>
  </div>
</template>

<style module>
.root {
  display: inline-block;
  white-space: nowrap;
}

.pass {
  color: darkgreen;
}

.fail {
  color: red;
}

.time {
  color: blue;
}
</style>

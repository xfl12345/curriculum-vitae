<script setup lang="ts">
import { onMounted } from 'vue'

import type { Emits } from './types'

const emit = defineEmits<Emits>()
onMounted(() => {
  emit('mounted')
})
</script>

<template>
  <div :class="$style.root"></div>
</template>

<style module>
.root {
  display: none;
}
</style>

<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { computed, ref } from 'vue'

import type { Props } from './types'

const props = defineProps<Props>()

enum CopyStatus {
  IDLE = 'idle',
  OK = 'ok',
  FAILED = 'failed',
}

const status = ref<CopyStatus>(CopyStatus.IDLE)
const buttonText = computed(() => {
  switch (status.value) {
    case CopyStatus.OK:
      return '复制成功'
    case CopyStatus.FAILED:
      return '复制失败'
    default:
      return '复制'
  }
})

let feedbackTimer: ReturnType<typeof setTimeout> | null = null
function updateFeedback(s: CopyStatus.OK | CopyStatus.FAILED) {
  status.value = s
  if (feedbackTimer) clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => (status.value = CopyStatus.IDLE), 3000)
}

const { copy, isSupported } = useClipboard()
async function handleCopy() {
  if (!isSupported.value) {
    updateFeedback(CopyStatus.FAILED)
    return
  }
  try {
    await copy(props.sourceContent)
    updateFeedback(CopyStatus.OK)
  } catch {
    updateFeedback(CopyStatus.FAILED)
  }
}
</script>

<template>
  <button type="button" @click="handleCopy">
    <slot :status="status">{{ buttonText }}</slot>
  </button>
</template>

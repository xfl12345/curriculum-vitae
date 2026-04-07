<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core'
import { onMounted, ref, useTemplateRef } from 'vue'

const templateRoot = useTemplateRef<HTMLDivElement>('templateRoot')
const width = ref(0)
const height = ref(0)

useResizeObserver(templateRoot, (entries) => {
  const entry = entries[0]!
  console.log(entry.contentRect)
  width.value = entry.contentRect.width
  height.value = entry.contentRect.height
})

onMounted(() => {
  width.value = templateRoot.value!.offsetWidth
  height.value = templateRoot.value!.offsetHeight
})
</script>

<template>
  <div ref="templateRoot" :class="$style.resize">width: {{ width }}, height: {{ height }}</div>
</template>

<style module>
.resize {
  background-color: orange;
  width: 300px;
  height: 300px;
  margin: 0 auto;
  resize: both;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>

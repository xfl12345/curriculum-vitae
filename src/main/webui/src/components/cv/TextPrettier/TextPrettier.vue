<script setup lang="tsx">
import isChinese from 'is-chinese'
import { computed, defineComponent } from 'vue'
import type { Props } from './types'

defineProps<Props>()

const DynamicSpan = defineComponent({
  props: {
    content: {
      type: String,
      default: '',
    },
    textClass: {
      type: String
    },
    textDefaultClass: {
      type: String,
      required: true
    }
  },
  setup(dynamicSpanProps) {
    function splitContent() {
      const text = dynamicSpanProps.content
      if (!text) return []

      const segments: Array<{ text: string; isChinese: boolean }> = []
      let currentPhase: string[] = []
      let isPreviousChinese = isChinese(text.charAt(0))
      currentPhase.push(text.charAt(0))

      const pushSegment = () => {
        segments.push({
          text: currentPhase.join(''),
          isChinese: isPreviousChinese,
        })
      }

      for (let i = 1; i < text.length; i++) {
        const char = text.charAt(i)
        const isCurrentChinese = isChinese(char)

        if (isPreviousChinese !== isCurrentChinese) {
          pushSegment()
          currentPhase = []
        }

        isPreviousChinese = isCurrentChinese
        currentPhase.push(char)
      }

      pushSegment()
      return segments
    }

    const nodes = computed(() => splitContent().map((segment, index) => (
      <span key={index} class={[
        segment.isChinese ? dynamicSpanProps.textClass : dynamicSpanProps.textDefaultClass
      ]}>{segment.text}</span>
    )))

    return () => nodes.value
  },
})
</script>

<template>
  <span>
    <DynamicSpan :content="content" :text-class="foxyTextClass" :text-default-class="$style.theDefault" />
  </span>
</template>

<style module>
.theDefault {
  font-size: inherit;
  font-family: 'Consolas, serif';
}
</style>

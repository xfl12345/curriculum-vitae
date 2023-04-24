<template>
  <div ref="templateRoot" style="white-space: nowrap">
    <span :style="{ paddingLeft: iconBoxHorizontalPadding, paddingRight: iconBoxHorizontalPadding }"
      >💥</span
    >
    <a :href="theUrl">
      <text-prettier :content="theUrl" style="display: inline" />
    </a>
  </div>
</template>

<script setup lang="tsx">
import { computed, defineProps, ref } from "vue";
import TextPrettier from "./xfl-common/vue/TextPrettier.vue";

const templateRoot = ref<HTMLDivElement>();

const props = defineProps({
  theFontSizeInPixel: {
    type: Number,
    default: 24
  },
  theUrl: {
    type: String,
    default: ""
  }
});

const iconBoxHorizontalPadding = computed(() => {
  return props.theFontSizeInPixel / 2 + "px";
});
</script>

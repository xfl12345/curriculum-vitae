<template>
  <div ref="templateRoot" :style="{ fontSize: theFontSize }">
    <div
      style="width: 100%; display: flex; box-sizing: border-box"
      :style="{ paddingLeft: theFontSize, paddingRight: theFontSize }"
    >
      <text-prettier style="flex: 2; text-align: left" :content="thePeriod" />
      <text-prettier style="flex: 3; text-align: center" :content="theHeaderCenter" />
      <text-prettier style="flex: 2; text-align: right" :content="theHeaderRight" />
    </div>
    <text-prettier style="width: 100%" :content="theBody" />
  </div>
</template>

<script setup lang="tsx">
import { computed, ref } from "vue";
import TextPrettier from "./xfl-common/vue/TextPrettier.vue";

const templateRoot = ref<HTMLDivElement>();

const props = defineProps({
  theFontSizeInPixel: {
    type: Number,
    default: 24
  },
  thePeriod: {
    type: String,
    default: ""
  },
  theHeaderCenter: {
    type: String,
    default: ""
  },
  theHeaderRight: {
    type: String,
    default: ""
  },
  theBody: {
    type: String,
    default: ""
  }
});

const theFontSize = computed(() => {
  return props.theFontSizeInPixel + "px";
});
</script>

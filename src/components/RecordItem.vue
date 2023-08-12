<template>
  <div ref="templateRoot" :style="{ fontSize: theFontSize }">
    <div style="width: 100%; display: flex; box-sizing: border-box; justify-content: space-between">
      <text-prettier :style="headerBoxCommonStyle" :content="thePeriod" />
      <text-prettier :style="headerBoxCommonStyle" :content="theHeaderCenter" />
      <text-prettier :style="headerBoxCommonStyle" :content="theHeaderRight" />
    </div>
    <text-prettier style="width: 100%" :content="theBody" />
  </div>
</template>

<script setup lang="tsx">
import { computed, ref } from "vue";
import { PartialCssStyleType } from "@/components/xfl-common/ts/PartialCssStyleType";
import TextPrettier from "@/components/xfl-common/vue/TextPrettier.vue";

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

const theFontSize = computed(() => props.theFontSizeInPixel + "px");
const headerBoxCommonStyle = computed((): PartialCssStyleType => {
  return {
    margin: "0 " + theFontSize.value,
    whiteSpace: "nowrap"
  };
});
</script>

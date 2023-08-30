<template>
  <div ref="templateRoot" :style="{ fontSize: theFontSize }">
    <div style="width: 100%; display: flex; box-sizing: border-box; justify-content: space-between">
      <text-prettier :style="headerBoxCommonStyle" :content="thePeriod" />
      <text-prettier :style="headerBoxCommonStyle" :content="theName" />
    </div>
    <div style="width: 100%">
      <text-prettier style="width: 100%" :content="theTechnologyStack" />
    </div>
    <div style="width: 100%">
      <text-prettier style="width: 100%" :content="theBody" />
    </div>
  </div>
</template>

<script setup lang="tsx">
import { computed, ref } from "vue";
import { VuePartialCssProperties } from "@/components/xfl-common/ts/VuePartialCssProperties";
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
  theName: {
    type: String,
    default: ""
  },
  theTechnologyStack: {
    type: String,
    default: ""
  },
  theBody: {
    type: String,
    default: ""
  }
});

const theFontSize = computed(() => props.theFontSizeInPixel + "px");
const headerBoxCommonStyle = computed((): VuePartialCssProperties => {
  return {
    margin: "0 " + theFontSize.value,
    whiteSpace: "nowrap"
  };
});
</script>

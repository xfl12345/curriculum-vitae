<template>
  <card-view
    ref="templateRoot"
    :the-font-size-in-pixel="theFontSizeInPixel"
    background-color="rgb(173, 216, 230)"
    :style="{ fontSize: theFontSize }"
  >
    <div style="width: 100%; display: flex; box-sizing: border-box; justify-content: space-between">
      <text-prettier :style="headerBoxCommonStyle" :content="thePeriod" />
      <text-prettier :style="headerBoxCommonStyle" :content="theHeaderCenter" />
      <text-prettier :style="headerBoxCommonStyle" :content="theHeaderRight" />
    </div>
    <text-prettier style="width: 100%" :content="theBody" />
  </card-view>
</template>

<script setup lang="tsx">
import { computed, ref } from "vue";
import { VuePartialCssProperties } from "@/components/xfl-common/ts/VuePartialCssProperties";
import TextPrettier from "@/components/xfl-common/vue/TextPrettier.vue";
import CardView from "@/components/CardView.vue";

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
const headerBoxCommonStyle = computed((): VuePartialCssProperties => {
  return {
    margin: "0 " + theFontSize.value,
    whiteSpace: "nowrap"
  };
});
</script>

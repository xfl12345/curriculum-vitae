<template>
  <div ref="templateRoot" :style="rootStyle">
    <div
      :style="{
        /* box-shadow: x-shadow y-shadow blur spread color inset; */
        backgroundColor,
        border: backgroundColor + ' solid 1px',
        borderRadius: quarterOfFontSize,
        boxShadow: oneEighthOfFontSize + ' ' + oneEighthOfFontSize + ' ' + oneEighthOfFontSize + ' 0 gray'
      }"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="tsx">
import { computed, ref } from "vue";
import { VuePartialCssProperties } from "@/components/xfl-common/ts/VuePartialCssProperties";

const templateRoot = ref<HTMLDivElement>();

const props = defineProps({
  theFontSizeInPixel: {
    type: Number,
    default: 24
  },
  backgroundColor: {
    type: String,
    default: "rgb(173, 216, 230)"
  }
});

const theFontSize = computed(() => props.theFontSizeInPixel + "px");
const quarterOfFontSizeInPixel = computed(() => {
  return Math.floor(props.theFontSizeInPixel / 4);
});
const quarterOfFontSize = computed(() => {
  return quarterOfFontSizeInPixel.value + "px";
});
const oneEighthOfFontSize = computed(() => {
  return Math.floor(quarterOfFontSizeInPixel.value / 2) + "px";
});
const rootStyle = computed<VuePartialCssProperties>(() => {
  return {
    margin:
      Math.floor(quarterOfFontSizeInPixel.value / 2) +
      "px " +
      quarterOfFontSize.value +
      " " +
      quarterOfFontSize.value +
      " " +
      quarterOfFontSize.value,
    fontSize: theFontSize.value
  };
});
</script>

<template>
  <progress-bar
    ref="templateRoot"
    :the-font-size-in-pixel="theFontSizeInPixel"
    :the-percent="thePercent"
    :the-border-color="borderColor"
    :the-content-color="theContentColor"
    :show-percent-number="showPercentNumber"
    :props-percent-number-style="propsPercentNumberStyle"
    :percent-number2-fixed="percentNumber2Fixed"
  />
</template>

<script setup lang="tsx">
import { computed, PropType, ref } from "vue";
import tinygradient from "tinygradient";
import ProgressBar from "./ProgressBar.vue";
import { VuePartialCssProperties } from "../ts/VuePartialCssProperties";

const props = defineProps({
  theFontSizeInPixel: {
    type: Number,
    default: 24
  },
  thePercent: {
    type: Number,
    default: 0.8
  },
  theBorderColor: {
    type: String,
    default: "auto"
  },
  progressBarColorArray: {
    type: Array as PropType<string[]>,
    default: () =>
      tinygradient("red", "aqua")
        .hsv(100, "long")
        .map((item) => item.toHexString())
  },
  showPercentNumber: {
    type: Boolean,
    default: false
  },
  propsPercentNumberStyle: {
    type: Object as PropType<VuePartialCssProperties>,
    default: (): VuePartialCssProperties => {
      return {};
    }
  },
  percentNumber2Fixed: {
    type: Number,
    default: 0
  }
});

const theContentColor = computed(() => {
  const arr = props.progressBarColorArray;
  return arr[Math.round((arr.length - 1) * props.thePercent)];
});

const borderColor = computed(() => {
  return props.theBorderColor === "auto" ? theContentColor.value : props.theBorderColor;
});

const templateRoot = ref<HTMLDivElement>();
</script>

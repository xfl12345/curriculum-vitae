<template>
  <div
    ref="templateRoot"
    style="
      box-sizing: border-box;
      border-style: solid;
      border-width: 2px;
      overflow: hidden;
      background-color: transparent;
      position: relative;
    "
    :style="{
      borderRadius: theFontSize,
      borderColor: theBorderColor,
      height: theFontSize,
      clipPath: `inset(0 round ${theFontSizeInPixel}px)`
    }"
  >
    <div
      style="height: 120%; margin: 0"
      :style="{
        width: thePercent * 100 + '%',
        backgroundColor: theContentColor
      }"
    />
    <center-box v-if="showPercentNumber" style="position: absolute; top: 0; left: 0; pointer-events: none">
      <span :style="[{ fontSize: theFontSize }, propsPercentNumberStyle]">{{
        (thePercent * 100).toFixed(percentNumber2Fixed) + "%"
      }}</span>
    </center-box>
  </div>
</template>

<script setup lang="tsx">
import { computed, ref, PropType } from "vue";
import { VuePartialCssProperties } from "../ts/VuePartialCssProperties";
import CenterBox from "./CenterBox.vue";

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
    default: "aqua"
  },
  theContentColor: {
    type: String,
    default: "aqua"
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

const theFontSize = computed(() => {
  return props.theFontSizeInPixel + "px";
});

const templateRoot = ref<HTMLDivElement>();
</script>

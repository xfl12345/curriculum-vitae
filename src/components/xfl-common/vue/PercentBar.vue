<template>
  <div
    ref="templateRoot"
    style="
      box-sizing: border-box;
      border-style: solid;
      border-width: 2px;
      overflow: hidden;
      vertical-align: middle;
    "
    :style="{ borderRadius: theFontSize, borderColor: theBorderColor, height: theFontSize }"
  >
    <div
      style="height: 200%; margin: 0"
      :style="{
        width: thePercent * 100 + '%',
        backgroundColor: theContentColor
      }"
    />
  </div>
</template>

<script setup lang="tsx">
import { computed, ref } from "vue";

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
    default: "#F87900"
  },
  contentColorFollowBorderColor: {
    type: Boolean,
    default: true
  }
});

const theFontSize = computed(() => {
  return props.theFontSizeInPixel + "px";
});

const theContentColor = computed(() => {
  return props.contentColorFollowBorderColor ? props.theBorderColor : "skyblue";
});

const templateRoot = ref<HTMLDivElement>();
</script>

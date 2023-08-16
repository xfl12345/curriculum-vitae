<template>
  <div
    ref="templateRoot"
    style="display: block; box-sizing: border-box; white-space: nowrap; vertical-align: top"
    :style="[propsCssStyle, rootHeightStyle, { fontSize: theFontSize }]"
  >
    <span
      style="display: inline-block; vertical-align: middle"
      :style="{
        padding: '0 ' + iconBoxHorizontalPadding,
        // lineHeight: theFontSize,
        fontSize: Math.floor(theFontSizeInPixel * 0.5) + 'px'
      }"
      >💥</span
    >
    <a
      style="display: inline; text-decoration: none; vertical-align: inherit; font-size: inherit"
      :href="theUrl"
    >
      <text-prettier
        style="display: inline-block; box-sizing: border-box; line-height: inherit; font-size: inherit"
        :content="theUrl"
        :props-css-style="{
          display: 'inline-block',
          boxSizing: 'border-box',
          verticalAlign: 'inherit',
          lineHeight: 'inherit',
          fontSize: 'inherit'
        }"
      />
    </a>
  </div>
</template>

<script setup lang="tsx">
import { computed, onMounted, PropType, ref } from "vue";
import { VuePartialCssProperties } from "@/components/xfl-common/ts/VuePartialCssProperties";
import TextPrettier from "@/components/xfl-common/vue/TextPrettier.vue";

const templateRoot = ref<HTMLDivElement>();

const props = defineProps({
  theFontSizeInPixel: {
    type: Number,
    default: 24
  },
  theUrl: {
    type: String,
    default: ""
  },
  useFontSizeAsHeight: {
    type: Boolean,
    default: false
  },
  propsCssStyle: {
    type: Object as PropType<VuePartialCssProperties>,
    default: (): VuePartialCssProperties => {
      return {};
    }
  }
});

const iconBoxHorizontalPadding = computed(() => props.theFontSizeInPixel / 4 + "px");

const theFontSize = computed(() => props.theFontSizeInPixel + "px");

const rootHeightStyle = computed(() => {
  return (
    props.useFontSizeAsHeight
      ? {
          height: theFontSize.value,
          lineHeight: theFontSize.value
        }
      : {}
  ) as VuePartialCssProperties;
});
</script>

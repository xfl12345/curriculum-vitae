<template>
  <div
    ref="templateRoot"
    style="width: 100%; display: table"
    :style="{ fontSize: theFontSize, lineHeight: theLineHeight }"
  >
    <div
      v-for="degreeItem in skillDegreeList"
      :key="degreeItem.skillName"
      style="display: table-row; width: 100%"
    >
      <div style="display: table-cell; width: 61.8%">
        <div :style="{ padding: '0 ' + quarterOfFontSize }">
          <rainbow-progress-bar
            :the-font-size-in-pixel="theFontSizeInPixel"
            :the-percent="degreeItem.degree"
            style="display: inline-block; vertical-align: text-bottom; width: 100%"
          />
        </div>
      </div>
      <div style="display: table-cell">
        <text-prettier
          :content="degreeItem.skillName"
          style="white-space: nowrap"
          :style="{ padding: '0 ' + quarterOfFontSize }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="tsx">
import { computed, PropType, ref } from "vue";
import TextPrettier from "@/components/xfl-common/vue/TextPrettier.vue";
import RainbowProgressBar from "@/components/xfl-common/vue/RainbowProgressBar.vue";
import { SkillDegree } from "@/tsmod/SkillDegree";

const templateRoot = ref<HTMLDivElement>();

const props = defineProps({
  theFontSizeInPixel: {
    type: Number,
    default: 24
  },
  skillDegreeList: {
    type: Array as PropType<SkillDegree[]>,
    default: () => {
      return [];
    }
  }
});

const theFontSize = computed(() => {
  return props.theFontSizeInPixel + "px";
});

const theLineHeight = computed(() => {
  return Math.ceil(props.theFontSizeInPixel * 1.25) + "px";
});

const quarterOfFontSize = computed(() => {
  return Math.floor(props.theFontSizeInPixel / 4) + "px";
});
</script>

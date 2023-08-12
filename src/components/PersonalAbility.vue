<template>
  <div
    ref="templateRoot"
    style="width: 100%; display: flex; vertical-align: middle"
    :style="{ margin: verticalMargin + ' auto' }"
  >
    <div style="width: 0; flex-grow: 618; flex-shrink: 1">
      <div style="height: 100%" :style="{ paddingLeft: theFontSize, paddingRight: theFontSize }">
        <center-box x-grow="1">
          <rainbow-progress-bar :the-font-size-in-pixel="theFontSizeInPixel" :the-percent="degree" />
        </center-box>
      </div>
    </div>
    <div style="width: 0; flex-grow: 382; flex-shrink: 0">
      <div style="height: 100%">
        <center-box x-grow="1">
          <text-prettier
            :content="theSkill"
            style="white-space: nowrap"
            :style="{ fontSize: theFontSize }"
          />
        </center-box>
      </div>
    </div>
  </div>
</template>

<script setup lang="tsx">
import { computed, ref } from "vue";
import TextPrettier from "@/components/xfl-common/vue/TextPrettier.vue";
import CenterBox from "@/components/xfl-common/vue/CenterBox.vue";
import RainbowProgressBar from "@/components/xfl-common/vue/RainbowProgressBar.vue";

const templateRoot = ref<HTMLDivElement>();

const props = defineProps({
  theFontSizeInPixel: {
    type: Number,
    default: 24
  },
  theSkill: {
    type: String,
    default: ""
  },
  degree: {
    type: Number,
    default: 0.6
  }
});

const theFontSize = computed(() => {
  return props.theFontSizeInPixel + "px";
});

const verticalMargin = computed(() => {
  return Math.floor(props.theFontSizeInPixel / 2) + "px";
});
</script>

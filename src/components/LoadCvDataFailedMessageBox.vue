<template>
  <div :style="{ fontSize: theFontSize }">
    <div>浏览器加载数据失败，原因如下：</div>
    <div ref="loadCvDataFailedMessageBox" style="border: hotpink dashed 1px; display: inline-block">
      {{ message }}
    </div>
    <br />
    <button
      style="cursor: pointer; font-size: inherit; font-family: inherit"
      :style="{ borderRadius: theFontSize }"
      @click="emit('jump2LoginPage')"
    >
      转跳登录界面
    </button>
    <br />
    <button
      style="cursor: pointer; font-size: inherit; font-family: inherit"
      :style="{ borderRadius: theFontSize }"
      @click="emit('refreshCvData')"
    >
      原地刷新
    </button>
  </div>
</template>

<script setup lang="tsx">
import { computed } from "vue";
import { getTextSize } from "@/components/xfl-common/ts/FontUtils";

const props = defineProps({
  theFontSizeInPixel: {
    type: Number,
    default: () => getTextSize("medium")
  },
  message: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["jump2LoginPage", "refreshCvData"]);

const theFontSize = computed<string>(() => {
  return props.theFontSizeInPixel + "px";
});
</script>

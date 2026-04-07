<script setup lang="ts">
import type { Emits, Props } from './types'

withDefaults(defineProps<Props>(), {
  theFontSizeInPixel: 16,
  message: '',
})

const emit = defineEmits<Emits>()

function jump2LoginPage() {
  emit('jump2LoginPage')
}

function refreshCvData() {
  emit('refreshCvData')
}
</script>

<template>
  <div :class="$style.root">
    <div>浏览器加载数据失败，原因如下：</div>
    <div :class="$style.errorMessage">{{ message }}</div>
    <br />
    <button :class="$style.btn" @click="jump2LoginPage">转跳登录界面</button>
    <br />
    <button :class="$style.btn" @click="refreshCvData">原地刷新</button>
  </div>
</template>

<style module>
.root {
  font-size: calc(v-bind(theFontSizeInPixel) * 1px);
}
.errorMessage {
  border: hotpink dashed 1px;
  display: inline-block;
}
.btn {
  cursor: pointer;
  font-size: inherit;
  font-family: inherit;
  border-radius: calc(v-bind(theFontSizeInPixel) * 1px);
}
</style>

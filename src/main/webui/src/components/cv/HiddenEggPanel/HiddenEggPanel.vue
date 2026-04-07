<script setup lang="ts">
import { NConfigProvider, NSlider, NSpace } from 'naive-ui'
import { computed, ref } from 'vue'

import { getTextSize } from '@/model/browser/FontUtils'
import { useFoxyBrowserStore } from '@/stores/foxy-browser'

import type { Emits, Props } from './types'

const rootScale = defineModel<number>('rootScale', { required: true })
const props = withDefaults(defineProps<Props>(), { theFontSizeInPixel: () => getTextSize('medium') })
const theFontSize = computed(() => props.theFontSizeInPixel + 'px')
const contentBoxMinWidth = computed(() => props.theFontSizeInPixel * 16 + 'px')

const templateRoot = ref<HTMLDivElement>()

const foxyBrowserStore = useFoxyBrowserStore()
const domBody = computed(() => foxyBrowserStore.computedDocument.body)

const emit = defineEmits<Emits>()
const jump2IndexPage = () => emit('jump2IndexPage')
const refreshCvData = () => emit('refreshCvData')
const resetRootScale = () => emit('resetRootScale')

const isPanelOpened = defineModel<boolean>('isPanelOpened', { required: true })
const closePanel = () => (isPanelOpened.value = false)
</script>

<template>
  <div v-if="isPanelOpened" ref="templateRoot" :class="$style.overlay" @click="closePanel">
    <div :class="$style.fullContainer">
      <div :class="$style.contentBox" @click.stop="">
        <div :class="$style.headerRow">
          <div>
            <span :class="$style.congrats">恭喜你发现了彩蛋！！！</span>
            <span>🌼🎉✨✨✨</span>
          </div>
          <div></div>
          <div>
            <button :class="$style.btn" @click="refreshCvData">刷新简历数据</button>
            <button :class="$style.btn" @click="jump2IndexPage">前往导航页面</button>
            <button :class="$style.btn" @click="closePanel">关闭彩蛋面板</button>
          </div>
        </div>
        <br />
        <br />
        <div>当前缩放倍率（拖动下方滚动条可以实时调节）：{{ rootScale }}</div>
        <div :class="$style.sliderRow">
          <div :class="$style.sliderContainer">
            <NConfigProvider :theme="null" :theme-overrides="{ common: { lineHeight: 'normal' } }">
              <!-- <NGlobalStyle /> -->
              <NSpace vertical>
                <NSlider
                  v-model:value="rootScale"
                  :step="0.5"
                  :min="0.5"
                  :max="30"
                  :marks="{ 4.5: '最小值' }"
                />
              </NSpace>
            </NConfigProvider>
          </div>
          <button :class="$style.btn" @click="resetRootScale">复位</button>
        </div>
        <br />
        <br />
        <div>提示：网页版简历里的二维码是可以点击的！</div>
      </div>
    </div>
  </div>
</template>

<style module>
.overlay {
  position: absolute;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.5);
  width: calc(v-bind('domBody.scrollWidth') * 1px);
  height: calc(v-bind('domBody.scrollHeight') * 1px);
}
.fullContainer {
  width: 100%;
  height: 100%;
  position: relative;
}
.contentBox {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 90vw;
  background-color: rgba(0, 0, 0, 0.8);
  border: 1px dashed hotpink;
  color: white;
  font-size: v-bind(theFontSize);
  min-width: v-bind(contentBoxMinWidth);
}
.headerRow {
  display: flex;
  justify-content: space-between;
}
.congrats {
  color: aqua;
}
.btn {
  cursor: pointer;
  font-size: inherit;
  border-radius: v-bind(theFontSize);
}
.sliderRow {
  display: flex;
}
.sliderContainer {
  flex-grow: 1;
  box-sizing: border-box;
  padding-left: 6px;
  padding-right: 6px;
}
</style>

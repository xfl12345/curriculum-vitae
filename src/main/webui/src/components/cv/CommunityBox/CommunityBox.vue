<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import VueQr, { type VueQrProps } from 'vue-qr'

import type { CommunityData } from '@/model/cv/types'

import { TextPrettier } from '@/components/cv/TextPrettier'
import { UrlItem } from '@/components/cv/UrlItem'

import type { Props } from './types'

const urlListContainer = ref<HTMLDivElement>()

const props = withDefaults(defineProps<Props>(), {
  theFontSizeInPixel: 24,
})

const fingerEmojiFontSizeInPixel = computed(() => Math.ceil((qrCodeHeightInPixel.value * 3) / 8))
const funnyWelcomeBoxFontSize = computed(() => Math.ceil(fingerEmojiFontSizeInPixel.value * 0.6) + 'px')

const community = computed<Required<CommunityData>>(() => ({
  communityUrlList: [],
  wechatUrl: '',
  weChatHeadPhoto: '',
  curriculumVitaeSourceCodeUrl: '',
  ...props.community,
}))

const wechatQrProps = computed<VueQrProps>(() => ({
  text: community.value.wechatUrl,
  logoSrc: community.value.weChatHeadPhoto,
  size: qrCodeHeightInPixel.value,
  margin: 0,
  colorLight: '#89D961',
  colorDark: '#76269E',
}))
const sourceCodeQrProps = computed<VueQrProps>(() => ({
  text: community.value.curriculumVitaeSourceCodeUrl,
  size: qrCodeHeightInPixel.value,
  margin: 0,
  colorLight: 'orange',
  colorDark: '#0057ff',
}))

function openUrl(url: string) {
  window.open(url)
}

const qrCodeHeightInPixel = ref(0)
const qrCodeHeight = computed(() => qrCodeHeightInPixel.value + 'px')
const isQrCodeContainerCanLoad = ref(false)
function qrCodeContainerResize(entry: { height: number }) {
  isQrCodeContainerCanLoad.value = false
  // console.log('qrCodeLeftBoxResize', entry)
  // console.log('qrCodeLeftBox.value?.offsetHeight', qrCodeLeftBox.value?.offsetHeight)
  qrCodeHeightInPixel.value = entry.height
  isQrCodeContainerCanLoad.value = true
}

onMounted(() => {
  if (urlListContainer.value) {
    qrCodeHeightInPixel.value = urlListContainer.value.offsetHeight
  }
})
</script>

<template>
  <div :class="$style.root">
    <div ref="urlListContainer" v-resize="qrCodeContainerResize" :class="$style.urlListBox">
      <UrlItem
        v-for="item in community.communityUrlList"
        :key="item"
        :the-font-size-in-pixel="theFontSizeInPixel"
        :the-url="item"
      />
    </div>
    <div v-if="isQrCodeContainerCanLoad && qrCodeHeightInPixel !== 0">
      <!-- 微信二维码 -->
      <VueQr v-bind="wechatQrProps" :class="$style.qrCode" @click="openUrl(community.wechatUrl)" />
      <!-- 二维码说明 -->
      <div :class="$style.middleBox">
        <div :class="$style.middleContent">
          <div :class="$style.middleItem">
            <span :class="$style.fingerEmoji">👈</span>
            <TextPrettier content="扫我加微信😉" :class="$style.funnyText" />
          </div>
          <div :class="$style.middleItem">
            <TextPrettier content="扫我拿简历源码" :class="$style.funnyText" />
            <span :class="$style.fingerEmoji">👉</span>
          </div>
        </div>
      </div>
      <!-- 项目 Git 仓库地址二维码 -->
      <VueQr
        v-bind="sourceCodeQrProps"
        :class="$style.qrCode"
        @click="openUrl(community.curriculumVitaeSourceCodeUrl)"
      />
    </div>
  </div>
</template>

<style module>
.root {
  display: flex;
  /* 解决左右 BOX 动态自适应的关键代码 */
  align-items: flex-start;
  justify-content: space-between;
  white-space: nowrap;
  vertical-align: middle;
  font-size: calc(v-bind(theFontSizeInPixel) * 1px);
}
.urlListBox {
  display: inline-block;
  vertical-align: top;
}
.qrCode {
  display: inline-block;
  vertical-align: top;
  cursor: pointer;
  overflow: hidden;
  width: v-bind(qrCodeHeight);
  height: v-bind(qrCodeHeight);
}
.middleBox {
  display: inline-block;
  height: v-bind(qrCodeHeight);
}
.middleContent {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  line-height: calc(v-bind(fingerEmojiFontSizeInPixel) * 1px);
}
.middleItem {
  display: inline-block;
  padding: 0;
  vertical-align: bottom;
}
.fingerEmoji {
  font-size: calc(v-bind(fingerEmojiFontSizeInPixel) * 1px);
}
.funnyText {
  font-size: v-bind(funnyWelcomeBoxFontSize);
  line-height: v-bind(funnyWelcomeBoxFontSize);
}
</style>

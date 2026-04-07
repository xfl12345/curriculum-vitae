<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  CaptchaBoxTypeRotate,
  CaptchaSlider,
  CaptchaSliderButton,
  DivTrianglePicture,
  DivSliderPicture,
  DivVerticalEquidistantLine,
} from '@/components/tianai-captcha'
import { XFLsCvCaptchaClient } from '@/model/web/api/captcha'

const captchaClient = new XFLsCvCaptchaClient()
const itemHeight = ref(300)
const halfItemHeight = computed(() => itemHeight.value / 2)
</script>

<template>
  <div :class="$style.page">
    <div :class="$style.box">
      <div :class="$style.label">DivTrianglePicture</div>
      <DivTrianglePicture :triangle-height-in-pixel="halfItemHeight" />
    </div>
    <div :class="$style.box">
      <div :class="$style.label">DivSliderPicture</div>
      <DivSliderPicture :box-height-in-pixel="halfItemHeight" />
    </div>
    <div :class="$style.box">
      <div :class="$style.label">DivVerticalEquidistantLine</div>
      <DivVerticalEquidistantLine :box-height-in-pixel="itemHeight" :box-width-in-pixel="itemHeight" />
    </div>
    <div :class="$style.box">
      <div :class="$style.label">CaptchaSliderButton</div>
      <CaptchaSliderButton :box-height-in-pixel="itemHeight" />
    </div>
    <div :class="$style.box">
      <div :class="$style.label">CaptchaSlider</div>
      <CaptchaSlider :bar-width-in-pixel="itemHeight" />
    </div>
    <div :class="$style.box">
      <div :class="$style.label">CaptchaBoxTypeRotate</div>
      <CaptchaBoxTypeRotate
        :box-height-in-pixel="itemHeight * 0.8"
        :tianai-captcha-client="captchaClient"
      />
    </div>
  </div>
</template>

<style module>
.page {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px;
}

.box {
  width: 300px;
  height: 300px;
  border: 1px dashed aqua;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.label {
  font-size: 12px;
  color: aqua;
  padding: 4px 0;
  white-space: nowrap;
}
</style>

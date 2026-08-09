<script setup lang="ts">
import { Close as CloseIcon, Refresh as RefreshIcon } from '@element-plus/icons-vue'
import { computed, onMounted, ref } from 'vue'

import type { ImageCaptchaTrack, TianaiTrackEvent } from '../common/types'
import type { Emits, Props } from './types'

import { CaptchaSlider } from '../CaptchaSlider'
import { SuccessOverlay } from '../SuccessOverlay'

const props = withDefaults(defineProps<Props>(), {
  boxHeightInPixel: 278,
  placeHolder: '拖动滑块完成拼图',
  enableResultFeedback: false,
})
const emit = defineEmits<Emits>()

// ── 状态枚举 ──

enum CaptchaStatus {
  LOADING,
  READY,
  VALIDATING,
  PASSED,
  FAILED,
  ERROR,
}

const status = ref<CaptchaStatus>(CaptchaStatus.LOADING)
const errorMessage = ref('')

const showImageArea = computed(() => status.value !== CaptchaStatus.ERROR)
const showErrorArea = computed(() => status.value === CaptchaStatus.ERROR)
const showSuccessOverlay = computed(() => status.value === CaptchaStatus.PASSED)
const showFooterFeedback = computed(
  () =>
    props.enableResultFeedback &&
    (status.value === CaptchaStatus.PASSED || status.value === CaptchaStatus.FAILED)
)

const resultColor = computed(() => (status.value === CaptchaStatus.PASSED ? 'darkgreen' : 'red'))
const resultText = computed(() => (status.value === CaptchaStatus.PASSED ? '验证通过' : '验证失败'))

// ── 几何计算（border 模式） ──

const boxPaddingInPixel = computed(() => Math.ceil(props.boxHeightInPixel * 0.03))
const boxInnerWidth = computed(() => props.boxHeightInPixel - 2 * boxPaddingInPixel.value)
const boxWidth = computed(() => props.boxHeightInPixel + 'px')
const boxPadding = computed(() => boxPaddingInPixel.value + 'px')

const bgImageWidth = computed(() => boxInnerWidth.value + 'px')
const bgImageHeight = computed(() => Math.floor(boxInnerWidth.value * 0.618) + 'px')

const footerBoxHeightInPixel = computed(() => Math.round(boxInnerWidth.value * 0.0923))
const footerBoxHeight = computed(() => footerBoxHeightInPixel.value + 'px')
const footerButtonMarginRight = computed(() => footerBoxHeightInPixel.value / 4 + 'px')
const footerHeight = computed(() => footerBoxHeightInPixel.value + boxPaddingInPixel.value + 'px')

const sliderPlaceholderFontSize = computed(() => Math.floor(boxInnerWidth.value * 0.07) + 'px')

// ── 拖拽旋转 ──

const captchaSlider = ref<InstanceType<typeof CaptchaSlider> | null>(null)
const sliderAvailableOffsetX = computed(() => {
  return captchaSlider.value?.buttonAvailableOffsetX ?? boxInnerWidth.value
})

const backgroundImageSource = ref('')
const sliderImageSource = ref('')
const rotateTransform = ref('rotate(0deg)')

const feedbackDurationMs = ref(1500)
const feedbackFadeOutDelay = computed(() => Math.max(feedbackDurationMs.value - 300, 0) + 'ms')

const blankImage =
  'data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg=='

function reset() {
  sliderImageSource.value = blankImage
  backgroundImageSource.value = blankImage
  captchaSlider.value?.resetButton()
  rotateTransform.value = 'rotate(0deg)'
}

async function refreshCaptcha() {
  reset()
  status.value = CaptchaStatus.LOADING
  try {
    await props.tianaiCaptchaClient.refresh()
    backgroundImageSource.value = props.tianaiCaptchaClient.backgroundImage
    sliderImageSource.value = props.tianaiCaptchaClient.sliderImage
    status.value = CaptchaStatus.READY
  } catch (error) {
    errorMessage.value = props.tianaiCaptchaClient.getReasonInText(error ?? {})
    status.value = CaptchaStatus.ERROR
  }
}

/** 关闭按钮点击：把原生 MouseEvent 透传给父级 */
function clickCloseButton(event: MouseEvent) {
  emit('clickCloseButton', event)
}

function movingSlider(trackRecord: TianaiTrackEvent) {
  const moveX = trackRecord.moveX!
  rotateTransform.value = `rotate(${moveX / (sliderAvailableOffsetX.value / 360)}deg)`
}

const rotateImage = ref<HTMLImageElement | null>(null)
async function valid(trackRecord: TianaiTrackEvent) {
  const sliderImg = rotateImage.value!
  const data: ImageCaptchaTrack = {
    bgImageWidth: sliderAvailableOffsetX.value,
    bgImageHeight: Math.floor(boxInnerWidth.value * 0.618),
    templateImageWidth: sliderImg.width,
    templateImageHeight: sliderImg.height,
    startTime: trackRecord.startTime.getTime(),
    stopTime: trackRecord.stopTime.getTime(),
    left: trackRecord.moveX,
    top: 0,
    trackList: trackRecord.tracks,
  }
  status.value = CaptchaStatus.VALIDATING
  try {
    const result = await props.tianaiCaptchaClient.validate(data)
    status.value = result.success ? CaptchaStatus.PASSED : CaptchaStatus.FAILED
    if (result.success) {
      setTimeout(() => {
        emit('captchaDone', result)
      }, feedbackDurationMs.value)
    } else {
      refreshCaptcha()
    }
  } catch (error) {
    errorMessage.value = props.tianaiCaptchaClient.getReasonInText(error ?? {})
    status.value = CaptchaStatus.ERROR
    setTimeout(() => {
      refreshCaptcha()
      emit('captchaDone', { success: false, payload: error ?? {} })
    }, feedbackDurationMs.value)
  }
}

onMounted(() => {
  refreshCaptcha()
})

defineExpose({ reset, refreshCaptcha })
</script>

<template>
  <div ref="templateRoot" :class="$style.root">
    <div :class="$style.imageContainer">
      <div v-if="showImageArea" :class="$style.imageArea">
        <img ref="rotateBgImg" :class="$style.bgImg" :src="backgroundImageSource" alt="" />
        <div :class="$style.rotateOverlay">
          <img ref="rotateImage" :class="$style.rotateImg" :src="sliderImageSource" alt="" />
        </div>
        <SuccessOverlay
          v-if="showSuccessOverlay"
          :class="$style.bgImg"
          :font-size="sliderPlaceholderFontSize"
          :fade-out-delay="feedbackFadeOutDelay"
        />
      </div>
      <div v-if="showErrorArea" :class="$style.errorArea">
        {{ errorMessage }}
      </div>
    </div>
    <CaptchaSlider
      ref="captchaSlider"
      :class="$style.slider"
      :allow-resume="false"
      :bar-height-in-pixel="Math.round(boxInnerWidth * 0.382 * 0.382)"
      :bar-width-in-pixel="boxInnerWidth"
      :placeholder="placeHolder"
      :placeholder-class="$style.sliderPlaceholder"
      @moving="movingSlider"
      @move-end="valid"
    />
    <div :class="$style.footer">
      <CloseIcon :class="$style.footerButton" @click="clickCloseButton" />
      <RefreshIcon :class="$style.footerButton" @click="refreshCaptcha" />
      <div v-if="showFooterFeedback" :class="$style.resultFeedback">
        {{ resultText }}
      </div>
    </div>
  </div>
</template>

<style module>
.root {
  box-sizing: border-box;
  user-select: none;
  background-color: #fff;
  box-shadow: 0 0 11px 0 #999999;
  width: v-bind(boxWidth);
  padding: v-bind(boxPadding);
  border-radius: v-bind(boxPadding);
}

.imageContainer {
  width: v-bind(bgImageWidth);
  height: v-bind(bgImageHeight);
}

.imageArea {
  width: 100%;
  height: 100%;
  position: relative;
}

.bgImg {
  width: 100%;
  height: 100%;
  position: absolute;
}

.rotateOverlay {
  position: absolute;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: center;
}

.rotateImg {
  height: 100%;
  transform: v-bind(rotateTransform);
}

.errorArea {
  width: 100%;
  height: 100%;
  white-space: pre-wrap;
  background-color: black;
  color: red;
  font-size: v-bind(footerBoxHeight);
}

.slider {
  margin: 11px 0;
}

.sliderPlaceholder {
  font-size: v-bind(sliderPlaceholderFontSize);
}

.footer {
  box-sizing: border-box;
  display: flex;
  vertical-align: middle;
  height: v-bind(footerHeight);
  padding-top: v-bind(boxPadding);
}

.footerButton {
  vertical-align: inherit;
  height: v-bind(footerBoxHeight);
  width: v-bind(footerBoxHeight);
  margin-right: v-bind(footerButtonMarginRight);
  cursor: pointer;
}

.resultFeedback {
  vertical-align: inherit;
  display: inline-block;
  margin-left: auto;
  color: v-bind(resultColor);
  font-size: v-bind(footerBoxHeight);
}
</style>

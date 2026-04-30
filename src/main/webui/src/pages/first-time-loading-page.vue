<script setup lang="ts">
import type { RouteNamedMap } from 'vue-router/auto-routes'

import tinygradient from 'tinygradient'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { CenterBox, CircleProgressBar, SvgRightPicturePath } from '@/components'
import { SupportedFontFamilyDetector } from '@/model/browser/FontDetector'
import { DEFAULT_FONT_LOADER_PHASE_MESSAGE_MAPPER, DefaultFontLoader } from '@/model/browser/FontLoader'
import { useFoxyBrowserStore } from '@/stores/foxy-browser'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const foxyBrowserStore = useFoxyBrowserStore()
const settingsStore = useSettingsStore()

const templateRoot = ref<HTMLDivElement>()
const canvas4font = ref<HTMLCanvasElement>()

const debugMode = computed(() => settingsStore.devMode)
const queryExhibition = `${route.query.exhibition ?? ''}`.toLowerCase()
const exhibition = queryExhibition === '' ? true : queryExhibition === 'true'

function jumpTarget(): void {
  const target = (route.query.jumpTarget as keyof RouteNamedMap | undefined) ?? '/'
  console.log('jumpTarget', target)
  router.push({ name: target })
}

// If already initiated and not in exhibition mode, redirect immediately
if (!exhibition && uiStore.isBrowserInitiated) {
  jumpTarget()
}

const windowSize = foxyBrowserStore.computedWindow

const progressMax = 100
const progress = ref(0)
const circleProgressBarColorArray = ref(
  tinygradient('red', 'aqua')
    .hsv(progressMax + 1, 'long')
    .map((item) => item.toHexString())
)

// TODO 根据 uiStore.browserInitState.needExtraFont 加速判断
// TODO 动画过程速度倍率模式，仅需动一个参数即可调节快慢
const checkItemNameList = ['正在检查您的浏览器，请稍等……', '正在检查浏览器对字体支持的情况']
const isShowPercentageBox = ref(true)
const isMounted = ref(false)
const checkItemIndex = ref(0)
const checkInfoOpacity = computed(() => (checkItemIndex.value === 1 ? 1 : 0))

const fontDetection = reactive({
  currentItem: {
    fontName: '',
    isSupport: false,
  },
  isNeedToLoadExtraFont: false,
  loadFontMessage: '',
  isAllRescueFailed: false,
})
const fontSupportColor = computed(() => (fontDetection.currentItem.isSupport ? 'darkGreen' : 'red'))

const circleProgressBarWidthInPixel = computed(() => {
  if (!isMounted.value) return 1000
  const min = Math.min(windowSize.innerWidth, windowSize.innerHeight)
  const padding = parseInt(getComputedStyle(templateRoot.value!).paddingTop, 10) << 1
  return min - padding
})

const circleProgressBarWidth = computed(() => circleProgressBarWidthInPixel.value + 'px')

const circleProgressBarStrokeWidthInPixel = computed(() => {
  const w = circleProgressBarWidthInPixel.value
  if (w >= 900) return 40
  if (w > 200) return w / 30
  return 4
})
const circleProgressBarStrokeWidth = computed(() => circleProgressBarStrokeWidthInPixel.value + 'px')

const diyFontFamilyList = uiStore.fontFamilyList

function onOneHundredReached(reached: boolean): void {
  if (reached) {
    setTimeout(() => {
      isShowPercentageBox.value = !reached
    }, 1000)
  } else {
    isShowPercentageBox.value = !reached
  }
}

function onAllDone(downloadedExtraFont?: boolean): void {
  if (downloadedExtraFont) {
    uiStore.browserInitStateMarkCompleted(downloadedExtraFont)
  }
  progress.value = progressMax
  if (!exhibition) {
    setTimeout(jumpTarget, 2300)
  }
}

function onFailed(): void {
  circleProgressBarColorArray.value = ['#FF0000', '#FF0000']
}

onMounted(() => {
  if (uiStore.isBrowserInitiated && !exhibition) return

  isMounted.value = true

  setTimeout(() => {
    checkItemIndex.value += 1

    const detector = new SupportedFontFamilyDetector()
    if (canvas4font.value) {
      detector.selectedFontCanvas = canvas4font.value
      detector.defaultFontCanvas.width = detector.selectedFontCanvas.width
      detector.defaultFontCanvas.height = detector.selectedFontCanvas.height
    }

    const progressUnit = progressMax / (diyFontFamilyList.length + 1)
    const supportFontStatus: Record<string, boolean> = {}
    let i = 0

    function processNext(): void {
      if (i >= diyFontFamilyList.length) {
        const anySupported = Object.values(supportFontStatus).some((v) => v)
        if (anySupported) {
          onAllDone(true)
          return
        }

        fontDetection.loadFontMessage = '由于所有字体均不支持，正在下载额外字体'
        fontDetection.isNeedToLoadExtraFont = true

        const fontLoader = new DefaultFontLoader(detector)
        fontLoader.onDownloadSuccess = (fontName) => {
          fontDetection.loadFontMessage =
            DEFAULT_FONT_LOADER_PHASE_MESSAGE_MAPPER.onDownloadSuccess(fontName)
          uiStore.addFontFamily(fontName)
        }
        fontLoader.onRenderSuccess = () => {
          onAllDone(true)
        }
        fontLoader.onRenderFailed = (message) => {
          onFailed()
          fontDetection.isAllRescueFailed = true
          fontDetection.loadFontMessage =
            '渲染失败。因浏览器不能正常显示字体，界面布局可能混乱，是否继续访问？'
          console.error(message)
        }

        fontLoader.loadKaiTiFont()
      }

      const fontName = diyFontFamilyList[i]!
      fontDetection.currentItem.fontName = fontName
      const isSupport = detector.isSupported(fontName)
      fontDetection.currentItem.isSupport = isSupport
      supportFontStatus[fontName] = isSupport

      // Animate progress incrementally
      const targetProgress = progress.value + progressUnit
      function tick(): void {
        if (progress.value < targetProgress) {
          progress.value += 1
          setTimeout(tick, 20)
        } else {
          i += 1
          processNext()
        }
      }
      tick()
    }

    processNext()
  }, 500)
})
</script>

<template>
  <div ref="templateRoot" :class="$style.root">
    <div v-if="debugMode" :class="$style.debug">
      {{ JSON.stringify({ innerWidth: windowSize.innerWidth, innerHeight: windowSize.innerHeight }) }}
    </div>
    <div :class="$style.progressWrapper">
      <div>
        <CircleProgressBar
          v-slot="slotProps"
          sizing-type="border"
          :progress="progress"
          :progress-max="progressMax"
          :rounded="true"
          :dom-square-box-width="circleProgressBarWidthInPixel"
          :stroke-width-in-pixel="circleProgressBarStrokeWidthInPixel"
          :color-filled="circleProgressBarColorArray"
          :transition-duration-in-seconds="0.3"
          @reached="onOneHundredReached"
        >
          <div :class="$style.slotContent">
            <div v-if="isShowPercentageBox" :class="$style.percentageBox">
              <div
                :class="$style.percentageTransition"
                :style="{
                  height: slotProps.isLimitReached ? '100%' : '50%',
                  fontSize: slotProps.innerBoxWidthInPixel / (slotProps.isLimitReached ? 2.2 : 2.5) + 'px',
                }"
              >
                <div
                  :class="[
                    $style.percentageInner,
                    slotProps.isLimitReached ? $style.percentageInnerFull : void 0,
                  ]"
                >
                  <div :class="slotProps.isLimitReached ? $style.percentageTextWrapper : void 0">
                    <span>{{ slotProps.percentage + '%' }}</span>
                  </div>
                </div>
              </div>
              <div
                :class="$style.checkInfo"
                :style="{ fontSize: slotProps.innerBoxWidthInPixel / 20 + 'px' }"
              >
                <span :class="$style.checkName">{{ checkItemNameList[checkItemIndex] }}</span>
                <br />
                <div :class="$style.checkDetail">
                  <div v-if="!fontDetection.isNeedToLoadExtraFont">
                    <span>字体名称：[{{ fontDetection.currentItem.fontName }}]</span>
                    <br />
                    <div>
                      是否支持：[<span :class="$style.fontSupportStatus">{{
                        fontDetection.currentItem.isSupport ? '是' : '否'
                      }}</span
                      >]
                    </div>
                  </div>
                  <div v-if="fontDetection.isNeedToLoadExtraFont">{{ fontDetection.loadFontMessage }}</div>
                  <div v-if="!fontDetection.isAllRescueFailed" :class="$style.fontPreview">
                    <span :class="$style.fontPreviewLabel">字体预览：</span>
                    <canvas
                      ref="canvas4font"
                      :height="slotProps.innerBoxWidthInPixel / 10"
                      :width="slotProps.innerBoxWidthInPixel / 10"
                      :class="$style.fontCanvas"
                    />
                  </div>
                  <div v-if="fontDetection.isAllRescueFailed">
                    <button @click="onAllDone()">Yes! Go on!</button>
                  </div>
                </div>
              </div>
            </div>
            <CenterBox v-if="!isShowPercentageBox">
              <svg
                :width="slotProps.innerBoxWidthInPixel * 0.8"
                :height="slotProps.innerBoxWidthInPixel * 0.6"
              >
                <SvgRightPicturePath
                  :class="$style.svgPath"
                  :offset-x="slotProps.innerBoxWidthInPixel * 0.8 * 0.05"
                  :offset-y="slotProps.innerBoxWidthInPixel * 0.6 * 0.05"
                  :width="slotProps.innerBoxWidthInPixel * 0.8 * 0.9"
                  :height="slotProps.innerBoxWidthInPixel * 0.6 * 0.9"
                />
              </svg>
            </CenterBox>
          </div>
        </CircleProgressBar>
        <div v-if="exhibition">
          <button @click="jumpTarget">点我继续转跳</button>
        </div>
        <div v-if="debugMode">
          <br />
          <input v-model.number="progress" type="number" />
        </div>
      </div>
    </div>
  </div>
</template>

<style module>
.root {
  height: 99vh;
  padding-top: 1vh;
}

.debug {
  position: fixed;
  top: 0;
  left: 0;
  border: hotpink dashed 1px;
  z-index: 1;
}

.progressWrapper {
  display: flex;
  justify-content: center;
  min-width: v-bind(circleProgressBarWidth);
  min-height: v-bind(circleProgressBarWidth);
}

.slotContent {
  height: 100%;
  width: 100%;
}

.percentageBox {
  width: 100%;
  height: 100%;
}

.percentageTransition {
  position: relative;
  transition-property: height, font-size, opacity;
  transition-duration: 0.8s, 0.8s, 1s;
  transition-timing-function: ease, ease, linear;
  transition-delay: 0s, 0s, 1s;
  line-height: 0.8;
}

.percentageInner {
  position: absolute;
  bottom: 0;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: center;
}

.percentageInnerFull {
  height: 100%;
}

.percentageTextWrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.checkInfo {
  height: 50%;
  width: 100%;
  text-align: center;
}

.checkName {
  white-space: pre-wrap;
}

.checkDetail {
  opacity: v-bind(checkInfoOpacity);
}

.fontSupportStatus {
  color: v-bind(fontSupportColor);
}

.fontPreview {
  display: inline;
}

.fontPreviewLabel {
  vertical-align: top;
}

.fontCanvas {
  border: blue solid 1px;
  vertical-align: text-top;
}

.svgPath {
  stroke: aqua;
  stroke-width: v-bind('circleProgressBarStrokeWidth');
  animation-timing-function: liner;
  transition-duration: 1s;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>

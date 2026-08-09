<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'

import { isDifferentArray, renderFontChar } from '@/model/browser/FontDetector'
import { getBroswerDefaultFirstFontFamilyName } from '@/model/browser/FontUtils'

import { BenchMarkResult, type BenchMarkResultTypes } from './BenchMarkResult'
import { FONT_NAMES, type FontNameEntry } from './FontNames'

const canvasSize = ref(600)

const selectedPlatformName = ref('')
onMounted(() => {
  if (selectedPlatformName.value === '') {
    selectedPlatformName.value = Object.keys(FONT_NAMES)[0]!
  }
})

const fontList = ref<FontNameEntry[]>([])
const selectedFont = ref<FontNameEntry>()
watch(selectedPlatformName, (newValue, oldValue) => {
  if (newValue !== oldValue) {
    fontList.value = FONT_NAMES[newValue] ?? []
    selectedFont.value = fontList.value[0]
  }
})

watch(selectedFont, (newValue, oldValue) => {
  if (newValue !== oldValue) {
    console.log(newValue?.en)
    if (newValue) {
      checkFontSupport(newValue.en)
    }
  }
})

function isDifferentArraySimple(aaList: number[], bbList: number[]): boolean {
  const toString = (theList: number[]) => theList.filter((item) => item !== 0).join(',')
  return toString(aaList) !== toString(bbList)
}

async function benchMark(
  testFunc: () => boolean,
  resultOutput: BenchMarkResultTypes.Props
): Promise<boolean> {
  resultOutput.pending = true
  resultOutput.isError = false
  const startTime = Date.now()
  try {
    const value = testFunc()
    const endTime = Date.now()
    resultOutput.pending = false
    resultOutput.isSupported = value
    resultOutput.elapsedTimeInMicroseconds = endTime - startTime
    return true
  } catch {
    const endTime = Date.now()
    resultOutput.isError = true
    resultOutput.isSupported = false
    resultOutput.elapsedTimeInMicroseconds = endTime - startTime
    return false
  }
}

const defaultFontCanvasRef = ref<HTMLCanvasElement>()
const selectedFontCanvasRef = ref<HTMLCanvasElement>()
const currentDefaultFont = getBroswerDefaultFirstFontFamilyName()
const benchMarkResult = reactive<{
  algorithmA: BenchMarkResultTypes.Props
  algorithmB: BenchMarkResultTypes.Props
}>({
  algorithmA: {
    algorithmName: 'algorithmA',
    pending: false,
    isError: false,
    isSupported: false,
    elapsedTimeInMicroseconds: 0,
  },
  algorithmB: {
    algorithmName: 'algorithmB',
    pending: false,
    isError: false,
    isSupported: false,
    elapsedTimeInMicroseconds: 0,
  },
})
async function checkFontSupport(fontName: string) {
  if (fontName.toLowerCase() === currentDefaultFont.toLowerCase()) {
    benchMarkResult.algorithmA.isSupported = true
    benchMarkResult.algorithmA.elapsedTimeInMicroseconds = 0
    benchMarkResult.algorithmB.isSupported = true
    benchMarkResult.algorithmB.elapsedTimeInMicroseconds = 0
    return
  }

  const defaultFontCanvas = defaultFontCanvasRef.value
  const selectedFontCanvas = selectedFontCanvasRef.value
  if (!defaultFontCanvas || !selectedFontCanvas) return

  const testChar = 'a'
  const defaultFontImage = renderFontChar(
    currentDefaultFont,
    currentDefaultFont,
    testChar,
    defaultFontCanvas
  )
  const customFontImage = renderFontChar(fontName, currentDefaultFont, testChar, selectedFontCanvas)

  await benchMark(() => isDifferentArray(defaultFontImage, customFontImage), benchMarkResult.algorithmA)
  await benchMark(
    () => isDifferentArraySimple(defaultFontImage, customFontImage),
    benchMarkResult.algorithmB
  )
}
</script>

<template>
  <div :class="$style.pageRoot">
    <div :class="$style.previewRow">
      <div :class="$style.canvasBox">
        <div>默认字体</div>
        <div :class="$style.canvasBorder">
          <canvas ref="defaultFontCanvasRef" :height="canvasSize" :width="canvasSize" />
        </div>
      </div>
      <div :class="$style.canvasBox">
        <div>选中字体</div>
        <div :class="$style.canvasBorder">
          <canvas ref="selectedFontCanvasRef" :height="canvasSize" :width="canvasSize" />
        </div>
      </div>
    </div>
    <div :class="$style.infoSection">
      <span>当前浏览器默认字体：{{ currentDefaultFont }}</span>
      <div :class="$style.selectRow">
        <span>字体平台：</span>
        <select v-model="selectedPlatformName">
          <option v-for="item in Object.keys(FONT_NAMES)" :key="item">{{ item }}</option>
        </select>
      </div>
      <div :class="$style.selectRow">
        <span>字体：</span>
        <select v-model="selectedFont">
          <option v-for="item in fontList" :key="item.en" :value="item">
            {{ item.zh }}
          </option>
        </select>
      </div>
      <div>字体英文名：{{ selectedFont?.en ?? '' }}</div>
      <div>数据量：{{ canvasSize * canvasSize }} 个像素</div>
      <span>浏览器是否支持选中字体：</span>
      <div v-if="selectedFont">
        <BenchMarkResult v-bind="benchMarkResult.algorithmA" /><br />
        <BenchMarkResult v-bind="benchMarkResult.algorithmB" />
      </div>
    </div>
    <BenchMarkResult
      algorithm-name="奇怪的算法"
      :pending="false"
      :is-error="true"
      :is-supported="false"
      :elapsed-time-in-microseconds="250"
    />
  </div>
</template>

<style module>
.pageRoot {
  display: flex;
  flex-direction: column;
  gap: 1em;
}

.previewRow {
  display: inline-flex;
  gap: 0.5em;
}

.canvasBox {
  display: inline-flex;
  flex-direction: column;
}

.canvasBorder {
  border: 1px solid aqua;
}

.infoSection {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.selectRow {
  display: flex;
  align-items: center;
  gap: 0.5em;
}
</style>

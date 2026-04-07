<script setup lang="ts">
import { computed, ref } from 'vue'

import type { Emits, Props } from './types'

import { CaptchaSliderButton } from '../CaptchaSliderButton'
import {
  getPoint2DFromMouseEvent,
  getPoint2DFromTouchEvent,
  type Point2D,
  TianaiTrackEvent,
  TrackType,
} from '../common/types'

const props = withDefaults(defineProps<Props>(), {
  barWidthInPixel: 260,
  barHeightInPixel: 38,
  allowResume: true,
  placeholder: '拖动滑块至正确位置',
  enablePadding: true,
  enablePrintLog: false,
})
const emit = defineEmits<Emits>()

// 纯模板绑定
const barWidth = computed(() => props.barWidthInPixel + 'px')
const barHeight = computed(() => props.barHeightInPixel + 'px')
const barBorderRadius = computed(() => props.barHeightInPixel + 'px')
const buttonTop = computed(() => -(props.barHeightInPixel / 2) + 'px')

const sliderButton = ref<InstanceType<typeof CaptchaSliderButton> | null>(null)
const buttonRadiusInPixel = computed(() => sliderButton.value?.radiusInPixel ?? 0)
const buttonHeightInPixel = computed(() => props.barHeightInPixel * 2)
const buttonAvailableOffsetX = computed(() => props.barWidthInPixel - buttonRadiusInPixel.value * 2)
const buttonLeftOffset = computed(() => -(buttonHeightInPixel.value / 2 - buttonRadiusInPixel.value))
const buttonLeft = computed(() => buttonLeftOffset.value + 'px')
const padding = computed(() => {
  if (props.enablePadding) {
    return buttonRadiusInPixel.value - props.barHeightInPixel / 2 + 1 + 'px 0'
  }

  return '0'
})

// ── 拖拽轨迹 ──

const trackBook = new Map<string, TianaiTrackEvent>()
const trackCallBackCleanerBook = new Map<string, () => void>()
const currentTrackId = ref('')
const resumeOffsetX = ref(0)
const isButtonDisabled = ref(false)
const buttonTransform = ref('translate(0, 0)')

function trackRecordHelper(
  trackRecord: TianaiTrackEvent,
  point: Point2D,
  currentTime: Date,
  type: TrackType
) {
  const startTime = trackRecord.startTime!
  const startPoint = trackRecord.startPoint!
  const end = buttonAvailableOffsetX.value
  let moveX = point.x - startPoint.x
  trackRecord.tracks.push({
    x: moveX,
    y: point.y - startPoint.y,
    type,
    t: currentTime.getTime() - startTime.getTime(),
  })
  if (props.allowResume) {
    moveX = resumeOffsetX.value + moveX
  }
  if (moveX < 0) {
    moveX = 0
  } else if (moveX > end) {
    moveX = end
  }
  trackRecord.moveX = moveX
  trackRecord.movePercent = moveX / buttonAvailableOffsetX.value
}

function onMoveStart(startPoint: Point2D, isMouseEvent: boolean) {
  const startTime = new Date()
  let id: string
  let trackRecord: TianaiTrackEvent
  if (currentTrackId.value !== '') {
    if (props.allowResume) {
      id = currentTrackId.value
      trackRecord = trackBook.get(id)!
      trackRecord.startPoint = startPoint
    } else {
      return
    }
  } else {
    id = startTime.toTimeString() + '_' + startTime.getMilliseconds() + '_' + Math.random()
    trackRecord = new TianaiTrackEvent()
    trackRecord.startTime = startTime
    trackRecord.startPoint = startPoint
    trackBook.set(id, trackRecord)
    if (trackBook.size === 1) {
      currentTrackId.value = id
    } else {
      trackBook.delete(id)
      return
    }
  }
  trackRecord.tracks.push({
    x: 0,
    y: 0,
    type: TrackType.DOWN,
    t: new Date().getTime() - startTime.getTime(),
  })
  if (isMouseEvent) {
    const onMovingCallback = (event: MouseEvent) => onMoving(getPoint2DFromMouseEvent(event, true))
    const onMoveEndCallback = (event: MouseEvent) => onMoveEnd(getPoint2DFromMouseEvent(event, true))
    window.addEventListener('mousemove', onMovingCallback)
    window.addEventListener('mouseup', onMoveEndCallback)
    trackCallBackCleanerBook.set(id, () => {
      window.removeEventListener('mousemove', onMovingCallback)
      window.removeEventListener('mouseup', onMoveEndCallback)
      trackCallBackCleanerBook.delete(id)
    })
  } else {
    const onMovingCallback = (event: TouchEvent) => onMoving(getPoint2DFromTouchEvent(event, true))
    const onMoveEndCallback = (event: TouchEvent) => onMoveEnd(getPoint2DFromTouchEvent(event, true))
    window.addEventListener('touchmove', onMovingCallback, false)
    window.addEventListener('touchend', onMoveEndCallback, false)
    trackCallBackCleanerBook.set(id, () => {
      window.removeEventListener('touchmove', onMovingCallback)
      window.removeEventListener('touchend', onMoveEndCallback)
      trackCallBackCleanerBook.delete(id)
    })
  }
  emit('moveStart', trackRecord)
}

function onMoving(point: Point2D) {
  const trackRecord = trackBook.get(currentTrackId.value)!
  trackRecordHelper(trackRecord, point, new Date(), TrackType.MOVE)
  buttonTransform.value = `translate(${trackRecord.moveX}px, 0)`
  emit('moving', trackRecord)
}

function onMoveEnd(point: Point2D) {
  const trackId = currentTrackId.value
  trackCallBackCleanerBook.get(trackId)!()
  const trackRecord = trackBook.get(trackId)!
  trackRecordHelper(trackRecord, point, new Date(), TrackType.UP)
  trackRecord.stopTime = new Date()
  if (props.allowResume) {
    resumeOffsetX.value = trackRecord.moveX
  } else {
    isButtonDisabled.value = true
  }
  emit('moveEnd', trackRecord)
}

const printLog = props.enablePrintLog
  ? (...params: Parameters<(typeof console)['log']>) => console.log(params)
  : () => {}

function buttonOnMouseDown(event: MouseEvent) {
  printLog('buttonOnMouseDown', event)
  onMoveStart(getPoint2DFromMouseEvent(event, true), true)
  emit('buttonOnMouseDown', event)
}
function buttonOnMouseUp(event: MouseEvent) {
  printLog('buttonOnMouseUp', event)
  emit('buttonOnMouseUp', event)
}
function buttonOnTouchStart(event: TouchEvent) {
  printLog('buttonOnTouchStart', event)
  onMoveStart(getPoint2DFromTouchEvent(event, true), false)
  emit('buttonOnTouchStart', event)
}
function buttonOnTouchEnd(event: TouchEvent) {
  printLog('buttonOnTouchEnd', event)
  emit('buttonOnTouchEnd', event)
}

function resetButton() {
  trackBook.clear()
  currentTrackId.value = ''
  if (sliderButton.value) {
    sliderButton.value.isMoving = false
  }
  buttonTransform.value = 'translate(0, 0)'
  isButtonDisabled.value = false
}
defineExpose({ resetButton, buttonAvailableOffsetX })
</script>

<template>
  <div ref="templateRoot" :class="$style.root">
    <div :class="$style.bar">
      <div :class="$style.placeholderContainer">
        <div :class="[$style.placeholder, placeholderClass]">
          {{ placeholder }}
        </div>
      </div>
      <CaptchaSliderButton
        ref="sliderButton"
        :class="$style.sliderButton"
        :box-height-in-pixel="buttonHeightInPixel"
        :is-disabled="isButtonDisabled"
        :touch-move-prevent-default="true"
        @button-on-mouse-down="buttonOnMouseDown"
        @button-on-mouse-up="buttonOnMouseUp"
        @button-on-touch-start="buttonOnTouchStart"
        @button-on-touch-end="buttonOnTouchEnd"
      />
    </div>
  </div>
</template>

<style module>
.root {
  padding: v-bind(padding);
}

.bar {
  background-color: rgb(223 225 226);
  position: relative;
  box-shadow: 0 0 2px 0 rgb(160 162 165) inset;
  display: flex;
  flex-direction: row;
  justify-content: center;
  width: v-bind(barWidth);
  height: v-bind(barHeight);
  border-radius: v-bind(barBorderRadius);
}

.placeholderContainer {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.placeholder {
  user-select: none;
  white-space: nowrap;
  color: #88949d;
}

.sliderButton {
  position: absolute;
  top: v-bind(buttonTop);
  left: v-bind(buttonLeft);
  transform: v-bind(buttonTransform);
}
</style>

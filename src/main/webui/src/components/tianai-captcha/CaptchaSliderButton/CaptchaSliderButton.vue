<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'

import { CenterBox } from '@/components'

import type { Props, Emits } from './types'

import { DivSliderPicture } from '../DivSliderPicture'
import { DivVerticalEquidistantLine } from '../DivVerticalEquidistantLine'

const props = withDefaults(defineProps<Props>(), {
  isDisabled: false,
  boxHeightInPixel: 56,
  deepInPixel: -1,
  propsRadiusInPixel: 56,
  touchMovePreventDefault: false,
})

// 内部状态
const isMoving = ref(false)
const enableShadow = ref(true)

/**
 * 盒子宽度字符串
 */
const boxWidth = computed(() => props.boxHeightInPixel + 'px')

/**
 * 阴影扩散宽度（像素）
 * 使用黄金比例三角函数计算
 */
const boxShadowSpreadWidthInPixel = computed(() => {
  const deep = props.deepInPixel < 0 ? props.boxHeightInPixel * (1 - 0.618) : props.deepInPixel
  // 黄金等腰三角形，凹槽深度做高，取底边的一半
  return deep / Math.tan((72 / 180) * Math.PI)
})

/**
 * 圆角半径（像素）
 */
const radiusInPixel = computed(() => {
  return Math.floor(
    props.boxHeightInPixel / 2 - (enableShadow.value ? boxShadowSpreadWidthInPixel.value : 0)
  )
})

/**
 * 图片高度（像素）
 * 使用黄金比例 0.618
 */
const pictureHeightInPixel = computed(() => {
  return radiusInPixel.value * 0.618
})

/**
 * 阴影样式字符串
 */
const boxShadow = computed(() => {
  if (!enableShadow.value) return 'none'
  return `0 0 ${boxShadowSpreadWidthInPixel.value}px 0 #999999`
})

/**
 * padding 值
 */
const padding = computed(() => (enableShadow.value ? boxShadowSpreadWidthInPixel.value + 'px' : '0'))

const emit = defineEmits<Emits>()
// 监听半径变化
watch(radiusInPixel, (newValue, oldValue) => {
  if (newValue !== oldValue) {
    emit('radiusChanged', newValue)
  }
})

// Expose properties for parent component access
defineExpose({
  isMoving,
  radiusInPixel,
})

// 组件挂载时发送初始半径
onMounted(() => {
  emit('radiusChanged', radiusInPixel.value)
})

/**
 * 鼠标按下
 */
function buttonOnMouseDown(event: MouseEvent) {
  isMoving.value = true
  emit('buttonOnMouseDown', event)
}

/**
 * 鼠标抬起
 */
function buttonOnMouseUp(event: MouseEvent) {
  isMoving.value = false
  emit('buttonOnMouseUp', event)
}

/**
 * 触摸开始
 */
function buttonOnTouchStart(event: TouchEvent) {
  isMoving.value = true
  emit('buttonOnTouchStart', event)
}

/**
 * 触摸结束
 */
function buttonOnTouchEnd(event: TouchEvent) {
  isMoving.value = false
  emit('buttonOnTouchEnd', event)
}
</script>

<template>
  <div ref="templateRoot" :class="$style.root">
    <!-- 圆圈边框 -->
    <div :class="[$style.circleBorder, buttonBorderClass]">
      <!-- 圆圈实体 -->
      <div
        :class="[$style.circleBody, buttonBodyClass]"
        @mousedown="buttonOnMouseDown"
        @mouseup="buttonOnMouseUp"
        @touchstart="buttonOnTouchStart"
        @touchend="buttonOnTouchEnd"
      >
        <!-- 使中心图标水平竖直方向都居中 -->
        <CenterBox>
          <!-- 中心图标 -->
          <slot>
            <DivVerticalEquidistantLine
              v-if="isDisabled || !isMoving"
              :box-height-in-pixel="pictureHeightInPixel"
              :box-width-in-pixel="pictureHeightInPixel"
              :use-default-shadow-style="enableShadow"
              :class="centerPictureClass"
            />
            <DivSliderPicture
              v-if="!isDisabled && isMoving"
              :box-height-in-pixel="pictureHeightInPixel * 0.8"
              :class="centerPictureClass"
            />
          </slot>
        </CenterBox>
        <!--遮罩实现屏蔽所有子元素的touchmove，可以防止滚动-->
        <div
          v-if="touchMovePreventDefault"
          :class="$style.touchMask"
          @touchmove.prevent="(event) => {}"
        ></div>
      </div>
    </div>
  </div>
</template>

<style module>
.root {
  box-sizing: border-box;
  width: v-bind(boxWidth);
  height: v-bind(boxWidth);
  padding: v-bind(padding);
}

.circleBorder {
  box-sizing: border-box;
  height: 100%;
  border-radius: 100%;
  overflow: hidden;
  box-shadow: v-bind(boxShadow);
}

.circleBody {
  position: relative;
  width: 100%;
  height: 100%;
  clip-path: circle(50%);
  cursor: pointer;
  background-color: white;
}

.touchMask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: transparent;
}
</style>

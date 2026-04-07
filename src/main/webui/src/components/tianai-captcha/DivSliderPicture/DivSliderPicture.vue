<script setup lang="ts">
import { computed } from 'vue'

import type { Props } from './types'

import { EnumDirection } from '../common/types'
import { DivTrianglePicture, type DivTrianglePictureTypes } from '../DivTrianglePicture'

const props = withDefaults(defineProps<Props>(), {
  boxHeightInPixel: 22,
  deepInPixel: -1,
  color: '#03DE00',
  shadowColor: '#999999',
})

// 容器宽度 = 2 * 高度
const boxWidth = computed(() => Math.floor(2 * props.boxHeightInPixel) + 'px')
const boxHeight = computed(() => props.boxHeightInPixel + 'px')

// 中间圆形直径
const dotWidthInPixel = computed(() => props.boxHeightInPixel / 2)
const dotWidth = computed(() => dotWidthInPixel.value + 'px')

// 阴影参数
const shadowSpread = computed(() => {
  const deep = props.deepInPixel < 0 ? dotWidthInPixel.value * (1 - 0.618) : props.deepInPixel
  // 黄金等腰三角形，凹槽深度做高，取底边的一半
  return deep / Math.tan((72 / 180) * Math.PI)
})

const leftDivTrianglePictureProps = computed<DivTrianglePictureTypes.Props>(() => ({
  direction: EnumDirection.LEFT,
  triangleHeightInPixel: props.boxHeightInPixel / 2,
  boxShadowBlur: dotWidthInPixel.value / 4,
  boxShadowSpread: shadowSpread.value,
  boxShadowColor: props.shadowColor,
}))

const rightDivTrianglePictureProps = computed(() => ({
  ...leftDivTrianglePictureProps.value,
  direction: EnumDirection.RIGHT,
}))

// 阴影样式字符串
const shadowStyle = computed(() => {
  const { boxShadowBlur, boxShadowSpread, boxShadowColor } = leftDivTrianglePictureProps.value
  return `0 0 ${boxShadowBlur}px ${boxShadowSpread}px ${boxShadowColor} inset`
})
</script>

<template>
  <div ref="templateRoot" :class="$style.root">
    <!-- 左三角 -->
    <DivTrianglePicture v-bind="leftDivTrianglePictureProps" />
    <!--中心小圆点-->
    <div :class="$style.centerCircleContainer">
      <div :class="$style.centerCircle"></div>
    </div>
    <!--右三角-->
    <DivTrianglePicture v-bind="rightDivTrianglePictureProps" />
  </div>
</template>

<style module>
.root {
  display: flex;
  justify-content: space-between;
  width: v-bind(boxWidth);
  height: v-bind(boxHeight);
}

.centerCircleContainer {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.centerCircle {
  border-radius: 100%;
  width: v-bind(dotWidth);
  height: v-bind(dotWidth);
  background-color: v-bind(color);
  box-shadow: v-bind(shadowStyle);
}
</style>

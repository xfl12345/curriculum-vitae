<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

import { EnumDirection } from '../common/types'
import { type Props } from './types'

const props = withDefaults(defineProps<Props>(), {
  triangleHeightInPixel: 100,
  direction: EnumDirection.LEFT,
  color: 'lawngreen',
  boxShadowHShadow: 0,
  boxShadowVShadow: 0,
  boxShadowBlur: 10,
  boxShadowSpread: 5,
  boxShadowColor: '#999999',
})

const triangleHeight = computed(() => props.triangleHeightInPixel + 'px')
const rootDynamicStyle = computed<CSSProperties>(() => {
  const s: CSSProperties = {}
  switch (props.direction) {
    case EnumDirection.RIGHT:
    case EnumDirection.LEFT:
      s.width = triangleHeight.value
      s.height = props.triangleHeightInPixel * 2 + 'px'
      break
    case EnumDirection.TOP:
    case EnumDirection.BOTTOM:
      s.width = props.triangleHeightInPixel * 2 + 'px'
      s.height = triangleHeight.value
      break
  }
  switch (props.direction) {
    case EnumDirection.RIGHT:
      s.clipPath = 'polygon(0 0, 100% 50%, 0 100%)'
      break
    case EnumDirection.LEFT:
      s.clipPath = 'polygon(100% 0, 0 50%, 100% 100%)'
      break
    case EnumDirection.TOP:
      s.clipPath = 'polygon(0 100%, 50% 0, 100% 100%)'
      break
    case EnumDirection.BOTTOM:
      s.clipPath = 'polygon(0 0, 50% 100%, 100% 0)'
      break
  }
  return s
})

const rotateBoxSize = computed(() => props.triangleHeightInPixel * 1.5 + 'px')
const rotateDynamicStyle = computed<CSSProperties>(() => {
  const s: CSSProperties = {
    backgroundColor: props.color,
    boxShadow: [
      props.boxShadowHShadow + 'px',
      props.boxShadowVShadow + 'px',
      props.boxShadowBlur + 'px',
      props.boxShadowSpread + 'px',
      props.boxShadowColor,
      'inset',
    ].join(' '),
  }
  switch (props.direction) {
    case EnumDirection.RIGHT:
      s.top = triangleHeight.value
      s.right = '0'
      s.transformOrigin = rotateBoxSize.value + ' 0'
      s.transform = 'rotate(45deg)'
      break
    case EnumDirection.LEFT:
      s.top = triangleHeight.value
      s.left = '0'
      s.transformOrigin = '0 0'
      s.transform = 'rotate(-45deg)'
      break
    case EnumDirection.TOP:
      s.top = '0'
      s.left = triangleHeight.value
      s.transformOrigin = '0 0'
      s.transform = 'rotate(45deg)'
      break
    case EnumDirection.BOTTOM:
      s.top = triangleHeight.value
      s.right = triangleHeight.value
      s.transformOrigin = rotateBoxSize.value + ' 0'
      s.transform = 'rotate(135deg)'
      break
  }
  return s
})

const helperLongEdge = computed(() => props.triangleHeightInPixel * 2 + 'px')
const helperShortEdge = computed(() => {
  const maxVal = props.boxShadowBlur > props.boxShadowSpread ? props.boxShadowBlur : props.boxShadowSpread
  return 8 * maxVal + 'px'
})
const triangleHelperDynamicStyle = computed<CSSProperties>(() => {
  const s: CSSProperties = {
    boxShadow: [
      props.boxShadowHShadow + 'px',
      props.boxShadowVShadow + 'px',
      props.boxShadowBlur + 'px',
      props.boxShadowSpread + 'px',
      props.boxShadowColor,
    ].join(' '),
    borderRadius: Math.ceil(7 * 0.414 * props.boxShadowBlur) + 'px',
  }
  switch (props.direction) {
    case EnumDirection.RIGHT:
      s.width = helperShortEdge.value
      s.height = helperLongEdge.value
      s.top = '0'
      s.left = '-' + helperShortEdge.value
      break
    case EnumDirection.LEFT:
      s.width = helperShortEdge.value
      s.height = helperLongEdge.value
      s.top = '0'
      s.left = triangleHeight.value
      break
    case EnumDirection.TOP:
      s.width = helperLongEdge.value
      s.height = helperShortEdge.value
      s.top = triangleHeight.value
      s.left = '0'
      break
    case EnumDirection.BOTTOM:
      s.width = helperLongEdge.value
      s.height = helperShortEdge.value
      s.top = '-' + helperShortEdge.value
      s.left = '0'
      break
  }
  return s
})
</script>

<template>
  <div ref="templateRoot" :class="$style.root">
    <div :class="$style.rotateBox" />
    <div :class="$style.triangleHelper" />
  </div>
</template>

<style module>
.root {
  position: relative;
  background-color: transparent;
  width: v-bind('rootDynamicStyle.width');
  height: v-bind('rootDynamicStyle.height');
  clip-path: v-bind('rootDynamicStyle.clipPath');
}

.rotateBox {
  box-sizing: border-box;
  position: absolute;
  width: v-bind(rotateBoxSize);
  height: v-bind(rotateBoxSize);
  background-color: v-bind('rotateDynamicStyle.backgroundColor');
  box-shadow: v-bind('rotateDynamicStyle.boxShadow');
  top: v-bind('rotateDynamicStyle.top');
  left: v-bind('rotateDynamicStyle.left');
  right: v-bind('rotateDynamicStyle.right');
  transform-origin: v-bind('rotateDynamicStyle.transformOrigin');
  transform: v-bind('rotateDynamicStyle.transform');
}

.triangleHelper {
  box-sizing: border-box;
  position: absolute;
  box-shadow: v-bind('triangleHelperDynamicStyle.boxShadow');
  border-radius: v-bind('triangleHelperDynamicStyle.borderRadius');
  width: v-bind('triangleHelperDynamicStyle.width');
  height: v-bind('triangleHelperDynamicStyle.height');
  top: v-bind('triangleHelperDynamicStyle.top');
  left: v-bind('triangleHelperDynamicStyle.left');
}
</style>

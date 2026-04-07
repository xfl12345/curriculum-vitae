<script setup lang="ts">
import viteLogo from '/vite.svg?url&no-inline'
import { onMounted, ref } from 'vue'

import { CopyButtonWithFeedback } from './CopyButtonWithFeedback'

const inputImgSrcURL = ref(viteLogo)
const imgSrcURL = ref('')
const syncImgSrcURL = async () => (imgSrcURL.value = inputImgSrcURL.value)
onMounted(() => syncImgSrcURL())

const canvasRef = ref<HTMLCanvasElement>()
const imgRef = ref<HTMLImageElement>()
const blobURL = ref('')
function updateDataURL() {
  blobURL.value = ''

  const canvas = canvasRef.value
  if (!canvas) {
    console.error('canvasRef.value is nil')
    return
  }

  const canvasContext2D = canvas.getContext('2d')
  if (!canvasContext2D) {
    console.error('canvasContext2D is nil')
    return
  }

  const img = imgRef.value
  if (!img) {
    console.error('imgRef.value is nil')
    return
  }

  const { naturalWidth: imgWidth, naturalHeight: imgHeight } = img
  canvas.height = imgHeight
  canvas.width = imgWidth

  canvasContext2D.drawImage(img, 0, 0, imgWidth, imgHeight)
  const blobData = canvas.toDataURL()
  blobURL.value = blobData
}
</script>

<template>
  <div :class="$style.pageRoot">
    <!-- 原图片 URL 输入区 -->
    <div :class="$style.controlBar">
      <span :class="$style.label">IMG source URL</span>
      <input v-model="inputImgSrcURL" type="text" />
      <button type="submit" @click="syncImgSrcURL">确定</button>
    </div>
    <div :class="$style.previewContainer">
      <!-- 显示原始图片 -->
      <div :class="$style.imgBox">
        <img ref="imgRef" :src="imgSrcURL" alt="" @load="updateDataURL" />
      </div>
      <!-- 显示 img 元素内容绘制到 canvas 的效果 -->
      <div :class="$style.imgBox">
        <canvas ref="canvasRef"></canvas>
      </div>
      <!-- 显示 canvas dump 生成 blob URL 的图片 -->
      <div :class="$style.imgBox">
        <img :src="blobURL" alt="" />
      </div>
    </div>
    <!-- blob URL 输出区 -->
    <div :class="$style.blobURLBox">
      <span :class="$style.label">IMG data URL</span>
      <pre :class="$style.dataUrlContent">{{ blobURL }}</pre>
      <CopyButtonWithFeedback :sourceContent="blobURL" />
    </div>
  </div>
</template>

<style module>
.pageRoot {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.label {
  color: blue;
}

.previewContainer {
  display: flex;
  justify-content: space-around;
  margin-top: 2em;
}

.imgBox {
  box-sizing: border-box;
  padding: 20px;
  border: hotpink solid 1px;
  vertical-align: top;
  display: flex;
  flex-direction: column;
  justify-content: center;

  > * {
    border: hotpink solid 1px;
  }
}

.dataUrlContent {
  white-space: pre-wrap;
  word-break: keep-all;
  overflow: auto;
}

.controlBar {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: center;
  border: hotpink solid 1px;
  gap: 1em;

  * {
    flex: none;
  }

  > input {
    flex: 0 1 auto;
    min-width: 0;
  }
}

.blobURLBox {
  margin-top: 2em;
  display: flex;
  flex-direction: column;
  border: hotpink solid 1px;
}
</style>

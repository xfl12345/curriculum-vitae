<script setup lang="ts">
import viteLogo from '/vite.svg?url&no-inline'
import { ref } from 'vue'

import { CopyButtonWithFeedback } from './CopyButtonWithFeedback'

const svgRef = ref<SVGElement>()
const blobURL = ref('')
async function syncBlobURL() {
  const svg = svgRef.value
  if (!svg) {
    console.error('svgRef.value is nill')
    return
  }

  let blobData: string = ''
  const svgUseElements = svg.getElementsByTagName('use')
  if (svgUseElements.length > 0) {
    const svgUseElement = svgUseElements[0]!
    // console.log(svgUseElement)
    const svgSrcURL = svgUseElement.getAttribute('href')
    if (svgSrcURL) {
      try {
        const response = await fetch(svgSrcURL)
        if (response.ok) {
          const blob = await response.blob()
          console.log('Blob:', blob)
          const reader = new FileReader()
          reader.onload = () => {
            blobData = reader.result as string
            // console.log(`SVG Blob URL=[${blobData}]`)
            blobURL.value = blobData
          }
          reader.readAsDataURL(blob)
          return
        } else {
          console.error(`fetch failed: ${response.status} ${response.statusText}`)
        }
      } catch (error) {
        console.error('fetch error:', error)
      }
    }
  } else {
    blobData = 'data:image/svg+xml;base64,' + window.btoa(svg.outerHTML)
    // console.log(`SVG Blob URL=[${blobData}]`)
    blobURL.value = blobData
  }
}
</script>

<template>
  <div :class="$style.pageRoot">
    <div :class="$style.previewContainer">
      <div :class="$style.svgBox">
        <svg ref="svgRef" viewBox="0 0 64 64" width="32" height="32">
          <use :href="`${viteLogo}`" width="64" height="64" @load="syncBlobURL" />
        </svg>
      </div>
      <div :class="$style.svgBox">
        <img :src="blobURL" alt="" />
      </div>
    </div>
    <div :class="$style.blobURLBox">
      <span :class="$style.label">SVG data URL</span>
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

.svgBox {
  display: flex;
  box-sizing: border-box;
  border: aqua solid 1px;
  vertical-align: middle;
  padding: 20px;
  > * {
    border: 1px solid aqua;
  }
}

.dataUrlContent {
  white-space: pre-wrap;
  word-break: keep-all;
  overflow: auto;
}

.blobURLBox {
  margin-top: 2em;
  display: flex;
  flex-direction: column;
  border: aqua solid 1px;
}
</style>

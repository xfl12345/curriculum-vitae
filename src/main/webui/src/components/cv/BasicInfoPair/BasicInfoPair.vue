<script setup lang="ts">
import { CopyDocument } from '@element-plus/icons-vue'
import { useClipboard } from '@vueuse/core'
import { ElIcon } from 'element-plus'
import { computed, ref, useCssModule } from 'vue'

import { CenterBox } from '@/components/common'
import { TextPrettier } from '@/components/cv/TextPrettier'

import type { Props } from './types'

const KEY_ROOT_BOX_WIDTH_USE_AUTO = 'auto'
const props = withDefaults(defineProps<Props>(), {
  keyValuePair: () => ({ theKey: '', theDisplayValue: '', theCopyValue: '' }),
  theMaxFontCount: 4,
  theFontSizeInPixel: 24,
  fixedKeyRootBoxWidth: KEY_ROOT_BOX_WIDTH_USE_AUTO,
})

const copyActionFeedback = ref({
  activated: false,
  succeed: false,
})

const cssModule = useCssModule()
type CssModuleKey = keyof typeof cssModule
const contentBoxClasses = computed<CssModuleKey[]>(() => {
  const classes = [cssModule.contentBox]
  if (copyActionFeedback.value.activated) {
    classes.push(copyActionFeedback.value.succeed ? cssModule.copySuccess : cssModule.copyFail)
  }

  return classes
})
const keyBoxClasses = computed<CssModuleKey[]>(() => {
  const classes = [cssModule.keyBox]
  classes.push(
    props.fixedKeyRootBoxWidth === KEY_ROOT_BOX_WIDTH_USE_AUTO
      ? cssModule.keyBoxAuto
      : cssModule.keyBoxFixed
  )
  return classes
})

const { copy } = useClipboard()
async function copyValue2ClipBoard() {
  const timeout = 3000
  try {
    await copy(props.keyValuePair.theCopyValue)
    copyActionFeedback.value.succeed = true
  } catch {
    copyActionFeedback.value.succeed = false
  }
  copyActionFeedback.value.activated = true
  setTimeout(() => {
    copyActionFeedback.value.activated = false
  }, timeout)
}

const rootBoxOfKey = ref<HTMLDivElement>()
defineExpose({ rootBoxOfKey })
</script>

<template>
  <div :class="$style.root">
    <div ref="rootBoxOfKey" :class="keyBoxClasses">
      <CenterBox>
        <div :class="$style.keyText">
          {{ keyValuePair.theKey }}
        </div>
      </CenterBox>
    </div>
    <div :class="contentBoxClasses" @click="copyValue2ClipBoard">
      <CenterBox x-grow="1">
        <div :class="$style.contentInner">
          <div :class="$style.hintContainer">
            <div v-if="!copyActionFeedback.activated" :class="$style.copyIconWrapper">
              <el-icon :size="theFontSizeInPixel - 1 + 'px'" color="#333">
                <CopyDocument />
              </el-icon>
            </div>
            <div v-else :class="$style.feedback">复制成功</div>
          </div>
          <div>
            <TextPrettier :content="keyValuePair.theDisplayValue" />
          </div>
        </div>
      </CenterBox>
    </div>
  </div>
</template>

<style module>
.root {
  display: flex;
  height: calc(v-bind(theFontSizeInPixel) * 1px + 6px);
  font-size: calc(v-bind(theFontSizeInPixel) * 1px);
}
.keyBox {
  font-weight: bold;
}
.keyBoxAuto {
  flex-grow: 2;
  flex-basis: 0;
}
.keyBoxFixed {
  width: v-bind('fixedKeyRootBoxWidth');
}
.keyText {
  text-align: justify-all;
  text-align-last: justify;
  white-space: nowrap;
  width: calc(v-bind(theFontSizeInPixel) * 1px * v-bind(theMaxFontCount));
}
.contentBox {
  flex-grow: 4;
  flex-basis: 0;
  cursor: pointer;
  transition-property: background-color;
  transition-timing-function: ease-out;
  transition-duration: 1s;
}
.contentBox:hover {
  background-color: yellow;
}
.contentBox.copySuccess {
  background-color: aqua;
}
.contentBox.copyFail {
  background-color: red;
}
.contentInner {
  position: relative;
}
.hintContainer {
  position: absolute;
  right: 0;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.1s ease-out,
    visibility 0.1s ease-out;
}
.contentBox:hover .hintContainer {
  opacity: 1;
  visibility: visible;
}
.copyIconWrapper {
  width: calc((v-bind(theFontSizeInPixel) - 1) * 1px);
}
.copyIcon {
  width: 100%;
  height: 100%;
}
.feedback {
  background-color: darkgreen;
  color: white;
  font-size: calc(v-bind(theFontSizeInPixel) * 1px * 0.8);
  border-radius: calc(v-bind(theFontSizeInPixel) * 1px);
  padding-left: calc(v-bind(theFontSizeInPixel) * 1px / 2);
  padding-right: calc(v-bind(theFontSizeInPixel) * 1px / 2);
}
</style>

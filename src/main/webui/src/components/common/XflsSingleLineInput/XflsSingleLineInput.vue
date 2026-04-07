<script setup lang="ts">
import { ref, computed } from 'vue'

import { useI18nStore } from '@/stores/i18n'

import type { Props, Emits } from './types'

const props = withDefaults(defineProps<Props>(), {
  theFontSizeInPixel: 24,
  theTitleBoxWidth: 'auto',
  theInputType: 'text',
})

const modelValue = defineModel<string>({ required: true })
const { currentI18nBook: currentBook } = useI18nStore()

const borderRadius = computed(() => `${Math.ceil(props.theFontSizeInPixel / 2)}px`)

const computedPlaceholder = computed(
  () => props.placeholder ?? `${currentBook.static.message.pleaseEnter}${props.theTitle}`
)

const inputArea = ref<HTMLInputElement>()
function inputAreaGetFocus() {
  inputArea.value?.focus()
}

const emit = defineEmits<Emits>()
function onKeyDownEnter() {
  emit('keyDownEnter')
}

function onInput(event: Event) {
  modelValue.value = (event.target as HTMLInputElement).value
}
</script>

<template>
  <div ref="templateRoot" :class="$style.root">
    <div :class="$style.titleBox" @click="inputAreaGetFocus">
      <slot name="titleLeft" />
      <slot name="title">
        {{ theTitle }}
      </slot>
      <slot name="titleRight" />
    </div>
    <slot name="inputLeft" />
    <div :class="$style.inputWrapper" @click="inputAreaGetFocus">
      <input
        ref="inputArea"
        :class="$style.input"
        :value="modelValue"
        :placeholder="computedPlaceholder"
        :type="theInputType"
        @input="onInput"
        @keydown.enter="onKeyDownEnter"
      />
    </div>
    <slot name="inputRight" />
  </div>
</template>

<style module>
.root {
  box-sizing: border-box;
  width: 100%;
  display: flex;
  white-space: nowrap;
  border-style: solid;
  border-width: 1px;
  overflow: hidden;
  vertical-align: top;
  padding: 0;
  font-size: v-bind('theFontSizeInPixel + "px"');
  border-color: deepskyblue;
  border-radius: v-bind('borderRadius');
}

.root:focus-within {
  border-color: aqua;
}

.titleBox {
  background-color: deepskyblue;
  height: 100%;
  vertical-align: top;
  padding: 0 v-bind('borderRadius');
  width: v-bind(theTitleBoxWidth);
}

.inputWrapper {
  flex-grow: 1;
  flex-shrink: 1;
  box-sizing: border-box;
  cursor: text;
  display: flex;
  padding: 0 v-bind('borderRadius');
}

.input {
  box-sizing: border-box;
  width: 0;
  border: none;
  resize: none;
  padding: 0;
  outline: none;
  vertical-align: top;
  height: 100%;
  background-color: transparent;
  font-family: inherit;
  color: yellow;
  min-width: 1px;
  flex-grow: 1;
  flex-shrink: 1;
  font-size: v-bind('theFontSizeInPixel + "px"');
}

.input::placeholder {
  color: darkgreen;
}

/* 移除数字输入框的上下箭头 */
.input::-webkit-outer-spin-button,
.input::-webkit-inner-spin-button {
  -webkit-appearance: none;
}

.input[type='number'] {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: textfield;
}
</style>

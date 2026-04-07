import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { getBroswerDefaultFirstFontFamilyName } from '@/model/browser/FontUtils'

import { AppStorageKey, type BrowserEnvState, useStorageStore } from './storage'

export interface BrowserInitState extends BrowserEnvState {
  completed: boolean
}

export const useUiStore = defineStore('ui', () => {
  const storageStore = useStorageStore()
  const bootstrapBrowserEnvState = storageStore.has(AppStorageKey.browserEnvState)
    ? storageStore.get(AppStorageKey.browserEnvState)
    : void 0

  const browserInitStateRef = ref<BrowserInitState>({
    ...bootstrapBrowserEnvState,
    completed: false,
  })
  const browserInitState = computed<BrowserInitState>({
    get(): BrowserInitState {
      return browserInitStateRef.value
    },
    set(value: BrowserInitState) {
      storageStore.set(AppStorageKey.browserEnvState, value)
      browserInitStateRef.value = value
    },
  })

  const isBrowserInitiated = computed(() => browserInitStateRef.value.completed)

  function browserInitStateMarkCompleted(needExtraFont: boolean): void {
    const newState: BrowserInitState = {
      completed: true,
      needExtraFont,
    }
    storageStore.set(AppStorageKey.browserEnvState, newState)
    browserInitStateRef.value = newState
  }

  // Font configuration
  const defaultFontFamily = getBroswerDefaultFirstFontFamilyName()

  const defaultFontFamilyList = [
    'Microsoft YaHei UI',
    ...document.defaultView!.getComputedStyle(document.body, '').fontFamily.split(','),
  ]

  const fontFamilyList = ref<string[]>(['楷体', 'KaiTi', '华文楷体', 'STKaiti'])

  function addFontFamily(fontName: string): void {
    fontFamilyList.value.unshift(fontName)
    console.log('addFontFamily', fontName)
  }

  const fontFamily = computed(() =>
    [...fontFamilyList.value, ...defaultFontFamilyList, defaultFontFamily].join(', ')
  )

  watch(
    fontFamily,
    () => {
      document.body.style.fontFamily = fontFamily.value
    },
    { immediate: true }
  )

  return {
    browserInitState,
    isBrowserInitiated,
    browserInitStateMarkCompleted,
    defaultFontFamily,
    defaultFontFamilyList,
    fontFamilyList,
    addFontFamily,
  }
})

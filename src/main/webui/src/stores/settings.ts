import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { AppStorageKey, useStorageStore } from './storage'

export const useSettingsStore = defineStore('settings', () => {
  const storageStore = useStorageStore()
  const bootstrapState = storageStore.has(AppStorageKey.developmentModeFlag)
    ? Boolean(storageStore.get(AppStorageKey.developmentModeFlag))
    : void 0

  const devModeRef = ref(bootstrapState ?? false)
  const devMode = computed<boolean>({
    get(): boolean {
      return devModeRef.value
    },
    set(flag: boolean) {
      if (persistDevModeRef.value) {
        storageStore.set(AppStorageKey.developmentModeFlag, flag)
      }

      devModeRef.value = flag
    },
  })

  const persistDevModeRef = ref(bootstrapState ?? false)
  const persistDevMode = computed<boolean>({
    get(): boolean {
      return persistDevModeRef.value
    },
    set(flag: boolean) {
      if (flag) {
        storageStore.set(AppStorageKey.developmentModeFlag, devModeRef.value)
      } else {
        storageStore.remove(AppStorageKey.developmentModeFlag)
      }

      persistDevModeRef.value = flag
    },
  })

  return { devMode, persistDevMode }
})

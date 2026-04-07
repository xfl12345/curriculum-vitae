import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'

export enum AppStorageKey {
  developmentModeFlag = 'developmentModeFlag',
  browserEnvState = 'browserEnvState',
}

export interface BrowserEnvState {
  needExtraFont?: boolean
}

export interface AppStorage {
  [AppStorageKey.developmentModeFlag]?: boolean
  [AppStorageKey.browserEnvState]?: BrowserEnvState
}

export const useStorageStore = defineStore('storage', () => {
  const storage = useLocalStorage<AppStorage>('xflsV1Storage', {})

  function set<K extends keyof AppStorage>(key: K, value: AppStorage[K]): void {
    storage.value[key] = value
  }

  function remove(key: keyof AppStorage): void {
    delete storage.value[key]
  }

  function has(key: keyof AppStorage): boolean {
    return key in storage.value
  }

  function get<K extends keyof AppStorage>(key: K): AppStorage[K] {
    return storage.value[key]
  }

  return { storage, set, remove, has, get }
})

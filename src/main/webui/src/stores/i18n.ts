import { defineStore } from 'pinia'
import { computed, readonly } from 'vue'
import { useI18n } from 'vue-i18n'

import type { AppLocaleMessageSchema } from '@/i18n'

export const useI18nStore = defineStore('i18n', () => {
  const appI18n = useI18n<AppLocaleMessageSchema>()

  const currentI18nBook = computed(() => readonly(appI18n.messages.value[appI18n.locale.value] ?? {}))

  return {
    appI18n,
    currentI18nBook,
  }
})

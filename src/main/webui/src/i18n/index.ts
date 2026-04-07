import { type DefaultLocaleMessageSchema, type I18nOptions, createI18n } from 'vue-i18n'

import zhCN from './zh-CN'

const messages = {
  'zh-CN': zhCN,
  // 'en-US': enUS,
} as const

const options: I18nOptions = {
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages,
}
export type MessageSchema = typeof zhCN
export type AppLocaleMessageSchema = DefaultLocaleMessageSchema & { message: MessageSchema }
export type AppI18nOptions = typeof options

export const i18n = createI18n<false, AppI18nOptions>(options)

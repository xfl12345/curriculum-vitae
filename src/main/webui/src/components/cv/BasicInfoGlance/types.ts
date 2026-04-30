import type { BasicInformation } from '@/model/business'

export interface Props {
  theFontSizeInPixel?: number
  basicInformation?: BasicInformation
}

export interface Emits {
  openHiddenEggPanel: []
}

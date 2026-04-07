import type { BasicInformation } from '@/model/cv/types'

export interface Props {
  theFontSizeInPixel?: number
  basicInformation?: BasicInformation
}

export interface Emits {
  openHiddenEggPanel: []
}

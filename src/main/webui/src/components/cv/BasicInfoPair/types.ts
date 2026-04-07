import type { ValuePair } from '@/model/cv/types'

export interface KeyValuePair extends ValuePair {
  theKey: string
}

export interface Props {
  keyValuePair?: KeyValuePair
  theMaxFontCount?: number
  theFontSizeInPixel?: number
  fixedKeyRootBoxWidth?: string
}

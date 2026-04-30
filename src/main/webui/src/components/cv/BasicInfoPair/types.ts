import type { ValuePair } from '@/model/business'

export interface KeyValuePair extends ValuePair {
  theKey: string
}

export interface Props {
  keyValuePair?: KeyValuePair
  theMaxFontCount?: number
  theFontSizeInPixel?: number
  fixedKeyRootBoxWidth?: string
}

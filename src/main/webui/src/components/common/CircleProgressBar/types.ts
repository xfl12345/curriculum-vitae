export type SizingType = 'content' | 'border'

export interface Props {
  progressMax: number
  progress: number
  sizingType?: SizingType
  domSquareBoxWidth?: number
  propsRadius?: number
  colorFilled?: string[]
  colorUnfilled?: string
  isShowPercentage?: boolean
  rounded?: boolean
  transitionDurationInSeconds?: number
  strokeWidthInPixel?: number
  innerBoxClass?: string
}

export interface Emits {
  reached: [value: boolean]
}

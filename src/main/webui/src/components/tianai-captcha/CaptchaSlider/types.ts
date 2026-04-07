import type { TianaiTrackEvent } from '../common/types'

export interface Props {
  /** 滑块条宽度（像素） */
  barWidthInPixel?: number
  /** 滑块条高度（像素） */
  barHeightInPixel?: number
  /** 是否允许恢复 */
  allowResume?: boolean
  /** 占位符文本 */
  placeholder?: string
  /** 占位符文本自定义 class */
  placeholderClass?: string
  /** 是否启用内边距 */
  enablePadding?: boolean
  /** 是否打印日志 */
  enablePrintLog?: boolean
}

export type Emits = {
  /** 移动开始事件 */
  moveStart: [track: TianaiTrackEvent]
  /** 移动中事件 */
  moving: [track: TianaiTrackEvent]
  /** 移动结束事件 */
  moveEnd: [track: TianaiTrackEvent]
  buttonOnMouseDown: [event: MouseEvent]
  buttonOnMouseUp: [event: MouseEvent]
  buttonOnTouchStart: [event: TouchEvent]
  buttonOnTouchEnd: [event: TouchEvent]
}

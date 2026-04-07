export interface Props {
  /** 字体大小（像素） */
  theFontSizeInPixel: number
  /** 标题文本 */
  theTitle: string
  /** 标题区域宽度 */
  theTitleBoxWidth?: string
  /** 占位符文本 */
  placeholder?: string
  /** 输入框类型 */
  theInputType?: string
}

export interface Emits {
  /** 按下回车键事件 */
  keyDownEnter: []
}

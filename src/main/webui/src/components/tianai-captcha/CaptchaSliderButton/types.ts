export interface Props {
  /** 是否禁用 */
  isDisabled?: boolean
  /** 方形盒子高度（像素） */
  boxHeightInPixel?: number
  /** 深度（像素，负值表示阴影向外） */
  deepInPixel?: number
  /** 圆角半径（像素） */
  propsRadiusInPixel?: number
  /** 触摸移动时是否阻止默认行为 */
  touchMovePreventDefault?: boolean
  /** 按钮本体（不含阴影）自定义 class */
  buttonBodyClass?: string
  /** 按钮边缘（阴影所在区）自定义 class */
  buttonBorderClass?: string
  /** 中心图片区域自定义 class */
  centerPictureClass?: string
}

export type Emits = {
  /** 鼠标按下事件 */
  buttonOnMouseDown: [event: MouseEvent]
  /** 鼠标抬起事件 */
  buttonOnMouseUp: [event: MouseEvent]
  /** 触摸开始事件 */
  buttonOnTouchStart: [event: TouchEvent]
  /** 触摸结束事件 */
  buttonOnTouchEnd: [event: TouchEvent]
  /** 半径变化事件 */
  radiusChanged: [radius: number]
}

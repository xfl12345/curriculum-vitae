export class Point2D {
  constructor(
    public x: number,
    public y: number
  ) {}
}

export function getPoint2DFromMouseEvent(event: MouseEvent, round: boolean): Point2D {
  return new Point2D(
    round ? Math.round(event.pageX) : event.pageX,
    round ? Math.round(event.pageY) : event.pageY
  )
}

export function getPoint2DFromTouchEvent(event: TouchEvent, round: boolean): Point2D {
  const touch = event.type === 'touchend' ? event.changedTouches[0]! : event.targetTouches[0]!
  return new Point2D(
    round ? Math.round(touch.pageX) : touch.pageX,
    round ? Math.round(touch.pageY) : touch.pageY
  )
}

export enum EnumDirection {
  TOP = 'top',
  RIGHT = 'right',
  BOTTOM = 'bottom',
  LEFT = 'left',
}

/**
 * 滑动轨迹类型
 * @see cloud.tianai.captcha.validator.common.constant.TrackTypeConstant
 */
export enum TrackType {
  /** 抬起. */
  UP = 'UP',
  /** 按下. */
  DOWN = 'DOWN',
  /** 移动. */
  MOVE = 'MOVE',
  /** 点击. */
  CLICK = 'CLICK',
}

/**
 * 图片验证码滑动轨迹
 * @see cloud.tianai.captcha.validator.common.model.dto.ImageCaptchaTrack
 */
export interface ImageCaptchaTrack {
  /** 背景图片宽度. */
  bgImageWidth: number
  /** 背景图片高度. */
  bgImageHeight: number
  /** 模板图片宽度. */
  templateImageWidth: number
  /** 模板图片高度. */
  templateImageHeight: number
  /** 滑动开始时间. */
  startTime: number
  /** 滑动结束时间. */
  stopTime: number
  /** 滑块 X 偏移. */
  left: number
  /** 滑块 Y 偏移. */
  top: number
  /** 滑动的轨迹. */
  trackList: Track[]
  /** 扩展数据，用于传输加密数据等. */
  data?: object
}

/**
 * 验证码/模板配置数据
 * @see cloud.tianai.captcha.application.vo.ImageCaptchaVO
 */
export interface ImageCaptchaVO {
  /** ID. */
  id: string
  /** 验证码类型. */
  type: string
  /** 背景图. */
  backgroundImage: string
  /** 移动图. */
  templateImage: string
  /** 背景图片所属标签. */
  backgroundImageTag: string
  /** 模板图片所属标签. */
  templateImageTag: string
  /** 背景图片宽度. */
  backgroundImageWidth: number
  /** 背景图片高度. */
  backgroundImageHeight: number
  /** 滑动图片宽度. */
  templateImageWidth: number
  /** 滑动图片高度. */
  templateImageHeight: number
  /** data 扩展数据. */
  data?: Record<string, object> | null
}

/** 验证码滑动事件数据（前端组件内部使用） */
export class TianaiTrackEvent {
  startTime = new Date()
  stopTime = new Date()
  tracks: Track[] = []
  startPoint?: Point2D
  moveX = 0
  movePercent = 0
}

/**
 * @see cloud.tianai.captcha.validator.common.model.dto.ImageCaptchaTrack.Track
 */
export interface Track {
  /** x. */
  x: number
  /** y. */
  y: number
  /** 时间. */
  t: number
  /** 类型. */
  type: TrackType
}

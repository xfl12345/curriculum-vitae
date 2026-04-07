import type { TianaiCaptchaClient, RequestResult } from '@/model/web/api/captcha'

export interface Props {
  /** 盒子高度（像素） */
  boxHeightInPixel?: number
  /** 天爱验证码客户端 */
  tianaiCaptchaClient: TianaiCaptchaClient
  /** 占位符文本 */
  placeHolder?: string
  /** 是否启用结果反馈 */
  enableResultFeedback?: boolean
}

export type Emits = {
  /** 验证完成事件 */
  captchaDone: [result: RequestResult<object>]
  /** 点击关闭按钮事件 */
  clickCloseButton: [event: Event]
}

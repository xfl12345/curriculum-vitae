import type { ImageCaptchaTrack, ImageCaptchaVO } from '@/components/tianai-captcha/common/types'

import { httpClient, type ApiResponse } from '../common'
import { RateLimitError } from '../common/types'

export interface RequestResult<T> {
  success: boolean
  payload: T
}

export interface CaptchaResultPayload {
  captchaPassed: boolean
  smsVerificationCodeSent?: boolean
}

export class TianaiCaptchaClient {
  currentCaptchaId = ''
  backgroundImage = ''
  sliderImage = ''
  /** 验证码类型. */
  captchaType = 'ROTATE'

  backendRequestPath = {
    /** 生成验证码. */
    refresh: 'captcha/generate',
    /** 校验验证码. */
    validate: 'captcha/check',
    /** 重新检查验证码状态. */
    recheckCaptchaIdStatus: 'captcha/check2',
  }

  /** 扩展数据提供者，用于传输加密数据等. */
  getVerificationPayload: (id: string, imageCaptchaTrack: ImageCaptchaTrack) => Promise<object> = () =>
    Promise.resolve({})

  /**
   * 生成验证码
   * @see cc.xfl12345.person.cv.controller.CaptchaController#generate(String)
   */
  async refresh(): Promise<RequestResult<ImageCaptchaVO>> {
    const response = await httpClient.Get<ImageCaptchaVO>(
      `${this.backendRequestPath.refresh}?type=${this.captchaType}`
    )
    this.currentCaptchaId = response.id
    this.backgroundImage = response.backgroundImage
    this.sliderImage = response.templateImage
    return { success: true, payload: response }
  }

  /**
   * 校验验证码
   * @see cc.xfl12345.person.cv.controller.CaptchaController#check(String, ImageCaptchaTrack)
   */
  async validate(imageCaptchaTrack: ImageCaptchaTrack): Promise<RequestResult<CaptchaResultPayload>> {
    const captchaId = this.currentCaptchaId
    const extraPayload = await this.getVerificationPayload(captchaId, imageCaptchaTrack)
    imageCaptchaTrack.data = extraPayload
    const response = await httpClient.Post<ApiResponse<CaptchaResultPayload>>(
      this.backendRequestPath.validate,
      imageCaptchaTrack,
      {
        params: { id: captchaId },
        meta: { keepRaw: true },
      }
    )

    return response
  }

  async recheckCaptchaIdStatus(captchaId: string): Promise<boolean> {
    return httpClient.Get<boolean>(`${this.backendRequestPath.recheckCaptchaIdStatus}?id=${captchaId}`)
  }

  getReasonInText(error: object): string {
    if (error instanceof RateLimitError) {
      return `冷却剩余时间：${error.retryAfterSeconds}秒\n`
    }
    if (error && 'response' in error) {
      const payload = error.response as ApiResponse
      let reason = ''
      if (payload.message) reason += `消息：${payload.message}\n`
      if (payload.code) reason += `状态码：${payload.code}\n`
      if ((payload.payload ?? false) && 'coolDownRemainder' in payload.payload) {
        reason += `冷却剩余时间：${(payload.payload.coolDownRemainder as number) / 1000}秒\n`
      }
      return reason
    }
    return '请求失败。原因未知。'
  }
}

/** 项目特定验证码客户端 */
export class XFLsCvCaptchaClient extends TianaiCaptchaClient {}

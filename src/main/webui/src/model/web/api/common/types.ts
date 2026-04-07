import type { AlovaGenerics, AlovaOptions, RespondedHandlerRecord } from 'alova'

export type SlimAlovaOptions = Pick<Required<AlovaOptions<AlovaGenerics>>, 'beforeRequest' | 'responded'>
export type RequestInterceptor = Required<SlimAlovaOptions['beforeRequest']>
export type RespondedHandler = RespondedHandlerRecord<AlovaGenerics>

export interface ApiResponse<T = object> {
  success: boolean
  version: string
  message: string
  code: number
  payload: T
}

export interface ApiRequest<T = object> {
  operation: string
  payload: T
}

export interface RateLimitedApiResultPayload {
  coolDownRemainder: number
}

/** HTTP 429 限流错误，含 Retry-After 信息 */
export class RateLimitError extends Error {
  readonly retryAfterSeconds: number
  constructor(retryAfterSeconds: number) {
    super(`请求过于频繁，请于 ${retryAfterSeconds} 秒后重试`)
    this.name = 'RateLimitError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}

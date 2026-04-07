import { httpClient } from '../common'

export type LoginResponseData = { saToken: string } | { coolDownRemainder: number } | null

/**
 * 全局 Alova hook 会自动解包 json.payload，所以返回的是内部 payload 字段。
 * - 登录成功: { saToken: string }
 * - 频率限制: { coolDownRemainder: number }
 * - 其他失败: null
 */
export function loginViaSms(phoneNumber: string, verificationCode: string) {
  return httpClient.Post<LoginResponseData>('/login', void 0, {
    params: { phoneNumber, verificationCode },
  })
}

export function checkLoginStatus() {
  return httpClient.Get<boolean>('/login/status')
}

export function logout() {
  return httpClient.Post<boolean>('/logout')
}

/** 游客登录，纯前端操作 */
export function loginAsAnonymous(): true {
  return true
}

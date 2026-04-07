import { defineStore } from 'pinia'
import { ref } from 'vue'

import * as authApi from '@/model/web/api/auth'
import { RateLimitError } from '@/model/web/api/common/types'

export interface LoginResult {
  success: boolean
  message: string
}

export const useAuthStore = defineStore('auth', () => {
  const signedIn = ref(false)
  const isAnonymous = ref(false)
  const phoneNumber = ref('')

  async function loginViaSms(phone: string, code: string): Promise<LoginResult> {
    let data: authApi.LoginResponseData
    try {
      data = await authApi.loginViaSms(phone, code)
    } catch (e) {
      if (e instanceof RateLimitError) {
        return { success: false, message: `请求过于频繁，请于 ${e.retryAfterSeconds} 秒后重试` }
      }
      return { success: false, message: '登录失败' }
    }

    // 全局 Alova hook 自动解包了 json.payload，需要从 payload 内容推断结果
    if (data != null && typeof data === 'object' && 'saToken' in data) {
      signedIn.value = true
      isAnonymous.value = false
      phoneNumber.value = phone
      return { success: true, message: '' }
    }

    if (data != null && typeof data === 'object' && 'coolDownRemainder' in data) {
      const seconds = Math.ceil((data as { coolDownRemainder: number }).coolDownRemainder / 1000)
      return { success: false, message: `请等待 ${seconds} 秒后重试` }
    }

    return { success: false, message: '登录失败' }
  }

  function loginAsAnonymous() {
    isAnonymous.value = true
    signedIn.value = true
    authApi.loginAsAnonymous()
  }

  async function logout() {
    if (isAnonymous.value) {
      isAnonymous.value = false
      signedIn.value = false
      phoneNumber.value = ''
    } else {
      await authApi.logout()
      signedIn.value = false
      phoneNumber.value = ''
    }
  }

  async function checkStatus() {
    if (isAnonymous.value) {
      signedIn.value = true
    } else {
      signedIn.value = await authApi.checkLoginStatus()
    }
  }

  return { signedIn, isAnonymous, phoneNumber, loginViaSms, loginAsAnonymous, logout, checkStatus }
})

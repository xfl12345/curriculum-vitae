import type { ApiResponse, RespondedHandler } from './types'

import { alovaHooks, ClassifiedContentType, getClassifiedContentType } from './alova'
import { RateLimitError } from './types'

export const APP_RESPONSED_HANDLER: RespondedHandler = {
  onSuccess: async (response: Response, methodInstance) => {
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      throw new RateLimitError(retryAfter ? parseInt(retryAfter, 10) : 60)
    }

    if (getClassifiedContentType(response) === ClassifiedContentType.JSON) {
      const json = (await response.json()) as ApiResponse<object>
      if (methodInstance.meta?.keepRaw) {
        return json
      }

      // 永不返回 undefined 以避免 response 已消费的数据流被重复读
      return json.payload ?? null
    }
  },
}

export function registerAppAlovaHooks() {
  alovaHooks.responded.add(APP_RESPONSED_HANDLER)
}

export function unregisterAppAlovaHooks() {
  alovaHooks.responded.remove(APP_RESPONSED_HANDLER)
}

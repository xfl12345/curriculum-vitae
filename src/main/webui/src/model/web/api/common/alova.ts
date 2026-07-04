import type { RequiredDeep } from 'type-fest'

import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'
import VueHook from 'alova/vue'
import { computed, ref, toRaw, type Ref } from 'vue'

import type { RequestInterceptor, RespondedHandler, SlimAlovaOptions } from './types'

import { API_URL_BASE } from './TheConst'

export class RefArrayManager<T> {
  private arrRef: Ref<T[]> = ref([])
  private computedArray = computed<T[]>(() => toRaw<T[]>(this.arrRef.value))

  /** 获取当前所有元素（只读） */
  list(): T[] {
    return this.computedArray.value
  }

  /** 添加一个元素 */
  add(handler: T): void {
    this.arrRef.value.push(handler)
  }

  /** 移除一个元素，返回是否成功移除 */
  remove(handler: T): boolean {
    const lengthBefore = this.arrRef.value.length
    this.arrRef.value = this.arrRef.value.filter((item) => item !== handler)
    return lengthBefore !== this.arrRef.value.length
  }

  /** 清空所有元素 */
  clear(): void {
    this.arrRef.value = []
  }
}

export const alovaHooks = {
  beforeRequest: new RefArrayManager<RequestInterceptor>(),
  responded: new RefArrayManager<RespondedHandler>(),
} satisfies Record<keyof SlimAlovaOptions, RefArrayManager<object>>

export enum ClassifiedContentType {
  JSON = 'json',
  TEXT = 'text',
  BLOB = 'blob',
  STREAM = 'stream',
  UNKNOWN = 'unknown',
}

export function getClassifiedContentType(response: Response) {
  const contentTypePattern = /content-type/i
  for (const key of response.headers.keys()) {
    if (contentTypePattern.test(key)) {
      const headerContentType: string | null = response.headers.get(key)
      if (!headerContentType) {
        return ClassifiedContentType.UNKNOWN
      }

      const normalizedType = headerContentType.trim().toLowerCase()
      if (normalizedType.startsWith('application/json')) {
        return ClassifiedContentType.JSON
      }

      if (normalizedType.startsWith('text/')) {
        return ClassifiedContentType.TEXT
      }

      if (normalizedType.startsWith('application/octet-stream')) {
        return ClassifiedContentType.BLOB
      }

      if (normalizedType.includes('stream')) {
        return ClassifiedContentType.STREAM
      }

      return ClassifiedContentType.UNKNOWN
    }
  }

  return null
}

export const DEFAULT_ALOVA_HOOK = {
  beforeRequest: async () => {},
  responded: {
    // oxlint-disable-next-line no-unused-vars
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onSuccess: async (response, method) => {
      switch (getClassifiedContentType(response)) {
        case ClassifiedContentType.JSON:
          return response.json()
        case ClassifiedContentType.TEXT:
          return response.text()
        case ClassifiedContentType.STREAM:
          return response.body
        case ClassifiedContentType.BLOB:
          return response.blob()
        default:
          return (response as Response)?.body
      }
    },
    onComplete: async () => {},
    onError: async () => {},
  },
} as const satisfies Readonly<RequiredDeep<SlimAlovaOptions>>

export const httpClient = createAlova({
  requestAdapter: adapterFetch(),
  statesHook: VueHook,
  baseURL: window.location.origin + API_URL_BASE,
  timeout: 80000,
  cacheFor: null,
  async beforeRequest(method) {
    for (const interceptor of alovaHooks.beforeRequest.list()) {
      const thePromise = typeof interceptor === 'function' ? interceptor(method) : interceptor
      await thePromise
    }
  },

  responded: {
    async onSuccess(response, method) {
      for (const handler of alovaHooks.responded.list()) {
        if (handler.onSuccess) {
          const result = await handler.onSuccess(response, method)
          if (result !== void 0) {
            return result
          }
        }
      }

      // fallback 兜底逻辑
      return await DEFAULT_ALOVA_HOOK.responded.onSuccess(response, method)
    },
    async onError(error, method) {
      for (const handler of alovaHooks.responded.list()) {
        if (handler.onError) {
          const result = await handler.onError(error, method)
          if (result !== void 0) {
            return result
          }
        }
      }
    },
    async onComplete(method) {
      for (const handler of alovaHooks.responded.list()) {
        if (handler.onComplete) {
          const result = await handler.onComplete(method)
          if (result !== void 0) {
            return result
          }
        }
      }
    },
  },
})
console.log('baseURL', httpClient.options.baseURL)

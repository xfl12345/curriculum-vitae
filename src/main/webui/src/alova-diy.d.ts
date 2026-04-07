import 'alova'

declare module 'alova' {
  export interface AlovaCustomTypes {
    meta: {
      /**
       * 保留原始响应数据，不进一步解包
       */
      keepRaw?: boolean
    }
  }
}

import fangZhengKaiTiUrl from '/font/FZ_KAITI_ZH_HANS.woff2?url&no-inline'

import { SupportedFontFamilyDetector } from './FontDetector'
import { applyNewFont2GlobalDom } from './FontUtils'

export interface FontLoaderCallbacks {
  onDownloadStart: (fontName: string) => void
  onDownloadSuccess: (fontName: string) => void
  onCheckFontSupport: (fontName: string) => void
  onRenderSuccess: (fontName: string) => void
  onRenderFailed: (fontName: string, message: string) => void
}

export type StringReturnFontLoaderCallbacks = {
  [K in keyof FontLoaderCallbacks]: (...args: Parameters<FontLoaderCallbacks[K]>) => string
}

export const DEFAULT_FONT_LOADER_PHASE_MESSAGE_MAPPER: StringReturnFontLoaderCallbacks = {
  onDownloadStart: (fontName) => `开始下载字体[${fontName}]`,
  onDownloadSuccess: (fontName) => `字体[${fontName}]下载成功，并已应用。正在检测能否渲染。`,
  onCheckFontSupport: (fontName) => `正在检测字体[${fontName}]的渲染支持`,
  onRenderSuccess: (fontName) => `字体[${fontName}]应用成功`,
  onRenderFailed: (fontName, message) => `字体[${fontName}]应用失败：${message}`,
}

export class FontLoader implements FontLoaderCallbacks {
  constructor(protected detector: SupportedFontFamilyDetector) {}

  onDownloadStart(fontName: string) {
    console.info(DEFAULT_FONT_LOADER_PHASE_MESSAGE_MAPPER.onDownloadStart(fontName))
  }
  onDownloadSuccess(fontName: string) {
    console.info(DEFAULT_FONT_LOADER_PHASE_MESSAGE_MAPPER.onCheckFontSupport(fontName))
  }
  onCheckFontSupport(fontName: string) {
    console.info(DEFAULT_FONT_LOADER_PHASE_MESSAGE_MAPPER.onCheckFontSupport(fontName))
  }
  onRenderSuccess(fontName: string) {
    console.info(DEFAULT_FONT_LOADER_PHASE_MESSAGE_MAPPER.onRenderSuccess(fontName))
  }
  onRenderFailed(fontName: string, message: string) {
    console.error(DEFAULT_FONT_LOADER_PHASE_MESSAGE_MAPPER.onRenderFailed(fontName, message))
  }

  async loadFont(fontName: string, fontUrl: string): Promise<void> {
    this.onDownloadStart(fontName)

    try {
      await applyNewFont2GlobalDom(fontName, `url(${fontUrl})`)
      this.onDownloadSuccess(fontName)

      this.onCheckFontSupport(fontName)
      // Check if the font can actually render
      if (this.detector.isSupported(fontName)) {
        this.onRenderSuccess(fontName)
      } else {
        this.onRenderFailed(fontName, '字体应用失败')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.onRenderFailed(fontName, message)
    }
  }
}

export class DefaultFontLoader extends FontLoader {
  constructor(protected detector: SupportedFontFamilyDetector) {
    super(detector)
  }

  async loadKaiTiFont() {
    return await super.loadFont('FangZhengKaiTi', fangZhengKaiTiUrl)
  }
}

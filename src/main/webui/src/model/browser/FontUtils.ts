import { parseFontFamilyAndGetTheFirstOne } from './CssFontParser'

export function getBroswerDefaultFirstFontFamilyName(): string {
  return parseFontFamilyAndGetTheFirstOne(
    window.getComputedStyle(document.documentElement).fontFamily,
    'serif'
  )
}

export function applyNewFont2GlobalDom(
  fontFamily: string,
  fontUrl: string
): Promise<FontFace | HTMLStyleElement> {
  return new Promise((resolve, reject) => {
    if ('add' in document.fonts) {
      const fontFace = new FontFace(fontFamily, fontUrl)
      fontFace.load().then(
        (loadedFont) => {
          document.fonts.add(loadedFont)
          resolve(loadedFont)
        },
        (reason) => {
          reject(reason)
        }
      )
    } else {
      try {
        const styleElement = document.createElement('style')
        const rule = `@font-face{font-family:"${fontFamily}";src:"${fontUrl}";}`
        styleElement.textContent = rule
        document.getElementsByTagName('head')[0]!.appendChild(styleElement)
        resolve(styleElement)
      } catch (e) {
        reject(e)
      }
    }
  })
}

export function getTextSize(fontSizeCode: string, testChar?: string): number {
  const divElement = document.createElement('div')
  divElement.style.visibility = 'hidden'
  divElement.style.fontSize = fontSizeCode
  divElement.style.display = 'inline-block'
  divElement.innerText = testChar ?? '正'
  document.body.appendChild(divElement)
  const result = parseFloat(window.getComputedStyle(divElement)?.width)
  document.body.removeChild(divElement)
  return result
}

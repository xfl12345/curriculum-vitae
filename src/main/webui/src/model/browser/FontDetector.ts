import { getBroswerDefaultFirstFontFamilyName } from './FontUtils'

export function isDifferentArray(aaList: number[], bbList: number[]): boolean {
  if (aaList.length !== bbList.length) {
    return true
  }

  const isDifferent = (a: number | undefined, b: number | undefined): boolean => {
    if (a === void 0 || b === void 0) {
      return true
    }
    return a !== b
  }

  const sliceMin = 16
  let status: { L: number; R: number }[] = []
  let statusTmp: { L: number; R: number }[] = []
  let count = 0

  status.push({ L: 0, R: aaList.length - 1 })
  while (count < aaList.length) {
    const currentStatusArrayLength = status.length
    for (let i = 0; i < currentStatusArrayLength; i += 1) {
      const item = status[i]!
      let isEndOfLife = false
      if (isDifferent(aaList[item.L], bbList[item.L]) || isDifferent(aaList[item.R], bbList[item.R])) {
        return true
      }
      if (item.L + 1 < item.R) {
        count += 2
        item.L += 1
        item.R -= 1
        if (item.L + sliceMin < item.R) {
          const total = item.L + item.R
          const mid = (total & 0x1) === 1 ? (total - 1) >> 1 : total >> 1
          statusTmp.push({ L: mid + 1, R: item.R })
          item.R = mid
        }
      } else if (item.L + 1 === item.R) {
        count += 2
      } else {
        count += 1
        isEndOfLife = true
      }
      if (!isEndOfLife) {
        statusTmp.push(status[i]!)
      }
    }

    status = statusTmp
    statusTmp = []
  }

  return false
}

export function renderFontChar(
  fontName: string,
  defaultFontName: string,
  testChar: string,
  canvas: HTMLCanvasElement
): number[] {
  const canvasContext = canvas.getContext('2d', {
    alpha: true,
    willReadFrequently: true,
  })
  if (!canvasContext) return []

  const width = canvas.width
  const height = canvas.height
  const fontSize = width
  canvasContext.clearRect(0, 0, width, height)
  canvasContext.textAlign = 'center'
  canvasContext.fillStyle = 'black'
  canvasContext.textBaseline = 'middle'
  canvasContext.font = `${fontSize}px ${fontName}, ${defaultFontName}`
  canvasContext.fillText(testChar, width / 2, height / 2)
  return [...canvasContext.getImageData(0, 0, width, height).data]
}

export class SupportedFontFamilyDetector {
  defaultFontName: string | undefined
  testChar: string = 'a'
  defaultFontCanvas: HTMLCanvasElement = document.createElement('canvas')
  selectedFontCanvas: HTMLCanvasElement = document.createElement('canvas')

  isSupported(fontName: string): boolean {
    const theDefaultFontName =
      this.defaultFontName === void 0 || this.defaultFontName === ''
        ? getBroswerDefaultFirstFontFamilyName()
        : this.defaultFontName

    if (fontName.toLowerCase() === theDefaultFontName.toLowerCase()) {
      return true
    }

    const defaultFontImage = renderFontChar(
      theDefaultFontName,
      theDefaultFontName,
      this.testChar,
      this.defaultFontCanvas
    )
    const customFontImage = renderFontChar(
      fontName,
      theDefaultFontName,
      this.testChar,
      this.selectedFontCanvas
    )
    return isDifferentArray(defaultFontImage, customFontImage)
  }
}

export function isSupportedFontFamily(fontName: string, defaultFontName?: string): boolean {
  const detector = new SupportedFontFamilyDetector()
  detector.defaultFontName = defaultFontName
  return detector.isSupported(fontName)
}

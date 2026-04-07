/**
 * @enum {number}
 */
enum states {
  VARIATION,
  LINE_HEIGHT,
  FONT_FAMILY,
  BEFORE_FONT_FAMILY,
  AFTER_OBLIQUE,
  ESCAPING,
  IDENTIFIER,
  HEXESCAPING,
}

export interface CssFontValue {
  font?: string
  fontFamily?: string[]
  fontFeatureSettings?: string
  fontKerning?: string
  fontOpticalSizing?: string
  fontPalette?: string
  fontSize?: string
  fontSizeAdjust?: string
  fontStretch?: string
  fontStyle?: string
  fontSynthesis?: string
  fontVariant?: string
  fontVariantAlternates?: string
  fontVariantCaps?: string
  fontVariantEastAsian?: string
  fontVariantLigatures?: string
  fontVariantNumeric?: string
  fontVariantPosition?: string
  fontVariationSettings?: string
  fontWeight?: string
  lineHeight?: string
}

type CssFontStrictValue = Required<CssFontValue>

function isValidIdentifier(identifier: string) {
  return !/^(-?\d|--)/.test(identifier)
}

function parseIdentifier(str: string): string | null {
  const identifiers: string[] = []
  let buffer = ''
  let hex = ''
  let state = states.IDENTIFIER

  for (let c, i = 0; ; i += 1) {
    c = str.charAt(i)
    if (c === '') {
      break
    }

    if (/[a-zA-Z\d\xa0-\uffff_-]/.test(c) && state === states.IDENTIFIER) {
      buffer += c
    } else if (c === '\\' && state === states.IDENTIFIER) {
      state = states.ESCAPING
    } else if (c === ' ' && state === states.IDENTIFIER) {
      if (buffer !== '') {
        if (isValidIdentifier(buffer)) {
          identifiers.push(buffer)
          buffer = ''
        } else {
          return null
        }
      }
    } else if (state === states.ESCAPING) {
      if (/[0-9a-f]/i.test(c)) {
        hex += c
        state = states.HEXESCAPING
      } else {
        buffer += c
        state = states.IDENTIFIER
      }
    } else if (state === states.HEXESCAPING) {
      if (/[0-9a-f]/i.test(c) && hex.length < 6) {
        hex += c
      } else {
        buffer += String.fromCodePoint(parseInt(hex, 16))
        buffer += c
        hex = ''
        state = states.IDENTIFIER
      }
    } else {
      return null
    }
  }

  if (buffer !== '') {
    if (isValidIdentifier(buffer)) {
      identifiers.push(buffer)
    } else {
      return null
    }
  }

  return identifiers.join(' ')
}

function parse(input: string, initialState: states): CssFontValue | null {
  let state = initialState
  let buffer = ''

  const result: CssFontStrictValue = {
    font: '',
    fontFamily: [],
    fontFeatureSettings: '',
    fontKerning: '',
    fontOpticalSizing: '',
    fontPalette: '',
    fontSize: '',
    fontSizeAdjust: '',
    fontStretch: '',
    fontStyle: '',
    fontSynthesis: '',
    fontVariant: '',
    fontVariantAlternates: '',
    fontVariantCaps: '',
    fontVariantEastAsian: '',
    fontVariantLigatures: '',
    fontVariantNumeric: '',
    fontVariantPosition: '',
    fontVariationSettings: '',
    fontWeight: '',
    lineHeight: '',
  }

  for (let c, i = 0; ; i += 1) {
    c = input.charAt(i)
    if (c === '') {
      break
    }
    if (state === states.BEFORE_FONT_FAMILY && (c === '"' || c === "'")) {
      let index = i + 1

      do {
        index = input.indexOf(c, index) + 1
        if (!index) {
          return null
        }
      } while (input.charAt(index - 2) === '\\')

      result.fontFamily.push(input.slice(i + 1, index - 1).replace(/\\('|")/g, '$1'))

      i = index - 1
      state = states.FONT_FAMILY
      buffer = ''
    } else if (state === states.FONT_FAMILY && c === ',') {
      state = states.BEFORE_FONT_FAMILY
      buffer = ''
    } else if (state === states.BEFORE_FONT_FAMILY && c === ',') {
      const identifier = parseIdentifier(buffer)

      if (identifier) {
        result.fontFamily.push(identifier)
      }
      buffer = ''
    } else if (state === states.AFTER_OBLIQUE && c === ' ') {
      if (/^(?:\+|-)?(?:[0-9]*\.)?[0-9]+(?:deg|grad|rad|turn)$/.test(buffer)) {
        result.fontStyle += ' ' + buffer
        buffer = ''
      } else {
        i -= 1
      }
      state = states.VARIATION
    } else if (state === states.VARIATION && (c === ' ' || c === '/')) {
      if (
        /^(?:(?:xx|x)-large|(?:xx|s)-small|small|large|medium)$/.test(buffer) ||
        /^(?:larg|small)er$/.test(buffer) ||
        /^(?:\+|-)?(?:[0-9]*\.)?[0-9]+(?:em|ex|ch|rem|vh|vw|vmin|vmax|px|mm|cm|in|pt|pc|%)$/.test(buffer)
      ) {
        state = c === '/' ? states.LINE_HEIGHT : states.BEFORE_FONT_FAMILY
        result.fontSize = buffer
      } else if (/^italic$/.test(buffer)) {
        result.fontStyle = buffer
      } else if (/^oblique$/.test(buffer)) {
        result.fontStyle = buffer
        state = states.AFTER_OBLIQUE
      } else if (/^small-caps$/.test(buffer)) {
        result.fontVariant = buffer
      } else if (/^(?:bold(?:er)?|lighter|normal)$/.test(buffer)) {
        result.fontWeight = buffer
      } else if (/^[+-]?(?:[0-9]*\.)?[0-9]+(?:e[+-]?(?:0|[1-9][0-9]*))?$/.test(buffer)) {
        const num = parseFloat(buffer)
        if (num >= 1 && num <= 1000) {
          result.fontWeight = buffer
        }
      } else if (/^(?:(?:ultra|extra|semi)-)?(?:condensed|expanded)$/.test(buffer)) {
        result.fontStretch = buffer
      }
      buffer = ''
    } else if (state === states.LINE_HEIGHT && c === ' ') {
      if (
        /^(?:\+|-)?([0-9]*\.)?[0-9]+(?:em|ex|ch|rem|vh|vw|vmin|vmax|px|mm|cm|in|pt|pc|%)?$/.test(buffer)
      ) {
        result.lineHeight = buffer
      }
      state = states.BEFORE_FONT_FAMILY
      buffer = ''
    } else {
      buffer += c
    }
  }

  if (state === states.FONT_FAMILY && !/^\s*$/.test(buffer)) {
    return null
  }

  if (state === states.BEFORE_FONT_FAMILY) {
    const identifier = parseIdentifier(buffer)

    if (identifier) {
      result.fontFamily.push(identifier)
    }
  }

  type SuppressKeyCopyWarningObject = Record<string, string | string[]>
  const optionalResult: SuppressKeyCopyWarningObject = {}

  const cssFontKeys = Object.keys(result) as (keyof CssFontValue)[]
  cssFontKeys.forEach((key) => {
    const sourceValue = result[key]
    if (sourceValue !== void 0) {
      if (Array.isArray(sourceValue)) {
        if (sourceValue.length !== 0) {
          optionalResult[key] = sourceValue
        }
      } else if (sourceValue !== '') {
        optionalResult[key] = sourceValue
      }
    }
  })

  return optionalResult as CssFontValue
}

export function parseFontFamily(str: string): string[] | null {
  const result = parse(str, states.BEFORE_FONT_FAMILY)
  if (result && result.fontFamily && result.fontFamily.length > 0) {
    return result.fontFamily
  }
  return null
}

export function parseFontFamilyAndGetTheFirstOne(str: string, defaultValue: string): string {
  const result = parseFontFamily(str)
  return result ? result[0]! : defaultValue
}

export const parseFont = (str: string): CssFontValue | null => parse(str, states.VARIATION)

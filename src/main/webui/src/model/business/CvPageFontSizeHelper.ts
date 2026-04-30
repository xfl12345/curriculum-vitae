import { nextTick } from 'vue'

export interface CvPageFontSizeHelperCallbacks {
  getCvBoxWidthInPixel(): number
  getCvBoxHeightInPixel(): number
  getScrollWidth(): number
  getScrollHeight(): number
  getFontSize(): number
  setFontSize(fontSize: number): void
  isNeedRestart(): boolean
  onRestarted(): void
  onFinished(): void
}

class TripleItemLog<T> {
  private items: T[] = []

  push(item: T): void {
    this.items.push(item)
    if (this.items.length > 3) {
      this.items.shift()
    }
  }

  getSize(): number {
    return this.items.length
  }

  getFirst(): T {
    return this.items.at(0)!
  }

  getMiddle(): T {
    return this.items[Math.floor(this.items.length / 2)]!
  }

  getLast(): T {
    return this.items.at(-1)!
  }

  clear(): void {
    this.items = []
  }
}

interface Adjustment {
  done: boolean
  adjustFunc: () => void
}

export class CvPageFontSizeHelper {
  private cvBoxWidthInPixel = 0
  private cvBoxHeightInPixel = 0
  private scrollWidth = 0
  private scrollHeight = 0
  private maxFontSize = 0
  private initialMaxFontSize = 0
  private minFontSize = 0
  private currentFontSize = 0
  private fontSizeLog = new TripleItemLog<number>()
  private horizontal: Adjustment
  private vertical: Adjustment
  private pendingCallback: (() => void) | null = null

  constructor(private callbacks: CvPageFontSizeHelperCallbacks) {
    this.horizontal = {
      done: false,
      adjustFunc: () => {
        if (this.fontSizeLog.getSize() > 2 && this.fontSizeLog.getFirst() === this.fontSizeLog.getLast()) {
          if (this.scrollWidth > this.cvBoxWidthInPixel) {
            if (Math.abs(this.maxFontSize - this.minFontSize) <= 1) {
              this.doSetFontSize(this.minFontSize)
            } else {
              const gap = Math.ceil(Math.abs(this.fontSizeLog.getMiddle() - this.fontSizeLog.getLast()) / 2)
              this.doSetFontSize(this.callbacks.getFontSize() - gap)
            }
          }
          this.horizontal.done = true
        } else if (this.scrollWidth > this.cvBoxWidthInPixel) {
          this.maxFontSize = this.currentFontSize
          this.doSetFontSize(this.getMiddleFontSize())
        } else if (this.scrollWidth <= this.cvBoxWidthInPixel) {
          if (this.minFontSize === this.maxFontSize) {
            this.horizontal.done = true
          } else {
            const gap = Math.abs(
              Math.ceil(this.scrollWidth / this.currentFontSize) -
                Math.ceil(this.cvBoxWidthInPixel / this.currentFontSize)
            )
            if (gap > 2) {
              this.maxFontSize = Math.min(this.maxFontSize + 2, this.initialMaxFontSize)
            }
            this.minFontSize = this.currentFontSize
            this.doSetFontSize(this.getMiddleFontSize())
          }
        }
      },
    }

    this.vertical = {
      done: false,
      adjustFunc: () => {
        if (this.scrollHeight > this.cvBoxHeightInPixel) {
          this.doSetFontSize(this.callbacks.getFontSize() - 1)
        } else {
          this.vertical.done = true
        }
      },
    }
  }

  private doSetFontSize(fontSize: number): void {
    this.currentFontSize = fontSize
    this.callbacks.setFontSize(this.currentFontSize)
    this.fontSizeLog.push(this.currentFontSize)
  }

  private updateData(): void {
    this.cvBoxWidthInPixel = this.callbacks.getCvBoxWidthInPixel()
    this.cvBoxHeightInPixel = this.callbacks.getCvBoxHeightInPixel()
    this.scrollWidth = this.callbacks.getScrollWidth()
    this.scrollHeight = this.callbacks.getScrollHeight()
    this.currentFontSize = this.callbacks.getFontSize()
  }

  private restart(): void {
    this.updateData()
    this.fontSizeLog.clear()
    this.maxFontSize = Math.floor(this.cvBoxWidthInPixel / 16)
    this.initialMaxFontSize = this.maxFontSize
    this.minFontSize = 1
    this.horizontal.done = false
    this.vertical.done = false
    console.log(
      'adjustFontSize onRestarted',
      JSON.stringify({
        cvBoxWidthInPixel: this.cvBoxWidthInPixel,
        scrollWidth: this.scrollWidth,
        currentFontSize: this.currentFontSize,
        minFontSize: this.minFontSize,
        maxFontSize: this.maxFontSize,
      })
    )
    this.callbacks.onRestarted()
  }

  private getMiddleFontSize(): number {
    return Math.floor((this.minFontSize + this.maxFontSize) / 2)
  }

  private onDomRefreshed = (): void => {
    if (this.callbacks.isNeedRestart()) {
      this.restart()
    } else {
      this.updateData()
    }

    if (!this.horizontal.done) {
      this.horizontal.adjustFunc()
      this.scheduleNext(() => setTimeout(this.onDomRefreshed, 150))
    } else if (!this.vertical.done) {
      this.vertical.adjustFunc()
      this.scheduleNext(() => setTimeout(this.onDomRefreshed, 150))
    } else {
      this.updateData()

      console.log(
        'adjustFontSize onFinished',
        JSON.stringify({
          cvBoxWidthInPixel: this.cvBoxWidthInPixel,
          scrollWidth: this.scrollWidth,
          currentFontSize: this.currentFontSize,
          currentMaxLine: Math.ceil(this.scrollHeight / this.currentFontSize),
          targetMaxLine: Math.ceil(this.cvBoxHeightInPixel / this.currentFontSize),
        })
      )
      this.callbacks.onFinished()
    }
  }

  private scheduleNext(fn: () => void): void {
    this.pendingCallback = fn
    void nextTick(() => {
      this.pendingCallback?.()
    })
  }

  adjustFontSize(): void {
    this.updateData()
    setTimeout(() => {
      this.scheduleNext(this.onDomRefreshed)
    }, 100)
  }
}

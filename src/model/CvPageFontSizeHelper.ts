import type { ComponentPublicInstance } from "vue";
import { TripleItemLog } from "@/components/xfl-common/ts/TripleItemLog";

export interface Adjustment {
  done: boolean;
  adjustFunc: () => any;
}

export interface CvPageDataProxy {
  getCvBoxWidthInPixel(): number;

  getCvBoxHeightInPixel(): number;

  getScrollWidth(): number;

  getScrollHeight(): number;

  getFontSize(): number;

  setFontSize(fontSize: number): void;

  isNeedRestart(): boolean;

  restartedCallback(): void;

  setNextDomRefreshedCallback(func: () => any): void;

  onFinishedCallback(): void;
}

export class CvPageFontSizeHelper {
  cvBoxWidthInPixel: number;

  cvBoxHeightInPixel: number;

  scrollWidth: number;

  scrollHeight: number;

  maxFontSize: number;

  minFontSize: number;

  currentFontSize: number;

  vueInstance: ComponentPublicInstance;

  dataProxy: CvPageDataProxy;

  fontSizeLog: TripleItemLog<number>;

  vertical: Adjustment;

  horizontal: Adjustment;

  constructor(vueInstance: ComponentPublicInstance, dataProxy: CvPageDataProxy) {
    const myself = this;
    this.fontSizeLog = new TripleItemLog<number>();
    this.vueInstance = vueInstance;
    this.dataProxy = dataProxy;
    this.horizontal = {
      done: false,
      adjustFunc: () => {
        if (
          myself.fontSizeLog.getSize() > 2 &&
          myself.fontSizeLog.getFirst() === myself.fontSizeLog.getLast()
        ) {
          // 如果超出宽度了，字体大小还是要扣回去滴！
          if (myself.scrollWidth > myself.cvBoxWidthInPixel) {
            if (Math.abs(myself.maxFontSize - myself.minFontSize) <= 1) {
              myself.dataProxy.setFontSize(myself.minFontSize);
              myself.debugLog(myself.fontSizeLog);
            } else {
              let gap = myself.fontSizeLog.getMiddle() - myself.fontSizeLog.getLast();
              gap = Math.ceil(Math.abs(gap) / 2);

              myself.dataProxy.setFontSize(myself.dataProxy.getFontSize() - gap);
            }
          }

          myself.horizontal.done = true;
          myself.debugLog("Horizontal adjustment done!");
        } else if (myself.scrollWidth > myself.cvBoxWidthInPixel) {
          myself.debugLog("minFontSize", myself.minFontSize);
          // myself.minFontSize = Math.floor(myself.currentFontSize - 2);
          myself.maxFontSize = myself.currentFontSize;
          myself.setFontSize(myself.getMiddleFontSize());
          myself.debugLog("Horizontal adjustment: Too big...Adjust FontSize to", myself.currentFontSize);
        } else if (myself.scrollWidth <= myself.cvBoxWidthInPixel) {
          if (myself.minFontSize === myself.maxFontSize) {
            myself.horizontal.done = true;
            myself.debugLog("Horizontal adjustment done!");
          } else {
            const gap = Math.abs(
              Math.ceil(myself.scrollWidth / myself.currentFontSize) -
                Math.ceil(myself.cvBoxWidthInPixel / myself.currentFontSize)
            );
            // if (gap > 1) {
            //   myself.maxFontSize += gap < 2 ? 1 : 2;
            // }
            if (gap > 2) {
              myself.maxFontSize += 2;
            }

            myself.minFontSize = myself.currentFontSize;
            myself.setFontSize(myself.getMiddleFontSize());
            myself.debugLog("Horizontal adjustment: Too small..Adjust FontSize to", myself.currentFontSize);
          }
        }
      }
    };
    this.vertical = {
      done: false,
      adjustFunc: () => {
        // 竖直方向暂时不使用二分算法，直接线性探索
        if (myself.scrollHeight > myself.cvBoxHeightInPixel) {
          myself.debugLog("Vertical adjustment:", "scrollHeight", myself.scrollHeight);
          myself.debugLog("Vertical adjustment:", "cvBoxHeightInPixel", myself.cvBoxHeightInPixel);
          myself.setFontSize(myself.dataProxy.getFontSize() - 1);
          myself.debugLog("Vertical adjustment: Too big...Adjust FontSize to", myself.currentFontSize);
        } else {
          myself.vertical.done = true;
          myself.debugLog("Vertical adjustment done!");
        }
      }
    };
  }

  // eslint-disable-next-line class-methods-use-this
  debugLog = (...data: any[]) => {
    console.log(...data);
  };

  setFontSize = (fontSize: number) => {
    const myself = this;
    myself.currentFontSize = fontSize;
    myself.dataProxy.setFontSize(myself.currentFontSize);
    myself.fontSizeLog.push(myself.currentFontSize);
  };

  updateData = () => {
    const myself = this;
    myself.cvBoxWidthInPixel = myself.dataProxy.getCvBoxWidthInPixel();
    myself.cvBoxHeightInPixel = myself.dataProxy.getCvBoxHeightInPixel();
    myself.scrollWidth = myself.dataProxy.getScrollWidth();
    myself.scrollHeight = myself.dataProxy.getScrollHeight();
    myself.currentFontSize = myself.dataProxy.getFontSize();
  };

  restart = () => {
    const myself = this;
    myself.updateData();

    myself.fontSizeLog.clear();
    myself.maxFontSize = Math.floor(myself.cvBoxWidthInPixel / 16);
    myself.minFontSize = 1;
    myself.horizontal.done = false;
    myself.vertical.done = false;
    myself.debugLog("cvBoxWidthInPixel", myself.cvBoxWidthInPixel);
    myself.debugLog("scrollWidth", myself.scrollWidth);
    myself.debugLog("Current FontSize", myself.currentFontSize);
    myself.debugLog("minFontSize", myself.minFontSize);
    myself.debugLog("maxFontSize", myself.maxFontSize);
    myself.dataProxy.restartedCallback();
  };

  getMiddleFontSize = () => Math.floor((this.minFontSize + this.maxFontSize) / 2);

  onDomRefreshed = () => {
    const myself = this;
    if (myself.dataProxy.isNeedRestart()) {
      myself.restart();
    } else {
      myself.updateData();
    }
    if (!myself.horizontal.done) {
      myself.horizontal.adjustFunc();
      myself.dataProxy.setNextDomRefreshedCallback(() => setTimeout(myself.onDomRefreshed, 150));
    } else if (!myself.vertical.done) {
      myself.vertical.adjustFunc();
      myself.dataProxy.setNextDomRefreshedCallback(() => setTimeout(myself.onDomRefreshed, 150));
    } else {
      myself.dataProxy.setNextDomRefreshedCallback(() => {});
      myself.updateData();
      myself.debugLog("adjustFontSize done.");
      myself.debugLog("cvBoxWidthInPixel", myself.cvBoxWidthInPixel);
      myself.debugLog("scrollWidth", myself.scrollWidth);
      myself.debugLog("Final FontSize", myself.currentFontSize);
      myself.debugLog("current maxLine", Math.ceil(myself.scrollHeight / myself.currentFontSize));
      myself.debugLog("target maxLine", Math.ceil(myself.cvBoxHeightInPixel / myself.currentFontSize));

      myself.dataProxy.onFinishedCallback();
    }
  };

  adjustFontSize = () => {
    const myself = this;
    myself.updateData();

    setTimeout(() => {
      myself.dataProxy.setNextDomRefreshedCallback(myself.onDomRefreshed);
    }, 100);
  };
}

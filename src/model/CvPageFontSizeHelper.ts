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
            } else {
              let gap = myself.fontSizeLog.getMiddle() - myself.fontSizeLog.getLast();
              gap = Math.ceil(Math.abs(gap) / 2);

              myself.dataProxy.setFontSize(myself.dataProxy.getFontSize() - gap);
            }
          }

          myself.horizontal.done = true;
          console.log("Horizontal adjustment done!");
        } else if (myself.scrollWidth > myself.cvBoxWidthInPixel) {
          console.log("minFontSize", myself.minFontSize);
          // myself.minFontSize = Math.floor(myself.currentFontSize - 2);
          myself.maxFontSize = myself.currentFontSize;
          myself.setFontSize(myself.getMiddleFontSize());
          console.log("Too big...Adjust FontSize to", myself.currentFontSize);
        } else if (myself.scrollWidth <= myself.cvBoxWidthInPixel) {
          const gap = Math.abs(
            Math.ceil(myself.scrollWidth / myself.currentFontSize) -
              Math.ceil(myself.cvBoxWidthInPixel / myself.currentFontSize)
          );
          if (gap > 2) {
            myself.maxFontSize += 2;
          }

          myself.minFontSize = myself.currentFontSize;
          myself.setFontSize(myself.getMiddleFontSize());
          console.log("Too small..Adjust FontSize to", myself.currentFontSize);
        }
      }
    };
    this.vertical = {
      done: false,
      adjustFunc: () => {}
    };
  }

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
    console.log("cvBoxWidthInPixel", myself.cvBoxWidthInPixel);
    console.log("scrollWidth", myself.scrollWidth);
    console.log("Current FontSize", myself.currentFontSize);
    console.log("minFontSize", myself.minFontSize);
    console.log("maxFontSize", myself.maxFontSize);
    myself.dataProxy.restartedCallback();
  };

  getMiddleFontSize = () => Math.round((this.minFontSize + this.maxFontSize) / 2);

  onDomRefreshed = () => {
    const myself = this;
    if (myself.dataProxy.isNeedRestart()) {
      myself.restart();
    } else {
      myself.updateData();
    }
    if (!myself.horizontal.done) {
      myself.horizontal.adjustFunc();
      myself.dataProxy.setNextDomRefreshedCallback(() => setTimeout(myself.onDomRefreshed, 4));
    } else {
      myself.dataProxy.setNextDomRefreshedCallback(() => {});
      myself.updateData();
      console.log("adjustFontSize done.");
      console.log("cvBoxWidthInPixel", myself.cvBoxWidthInPixel);
      console.log("scrollWidth", myself.scrollWidth);
      console.log("Final FontSize", myself.currentFontSize);
      console.log("current maxLine", Math.ceil(myself.scrollHeight / myself.currentFontSize));
      console.log("target maxLine", Math.ceil(myself.cvBoxHeightInPixel / myself.currentFontSize));

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

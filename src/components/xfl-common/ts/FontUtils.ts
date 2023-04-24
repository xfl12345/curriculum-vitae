import { parseFontFamilyAndGetTheFirstOne } from "./CssFontParser";

export const createFontFaceCssStyleElement = (fontFamily: string, fontUrl: string) => {
  const styleElement = document.createElement("style");
  styleElement.innerHTML = '@font-face{font-family:"' + fontFamily + '";src:"' + fontUrl + '";}';
  return styleElement;
};

export const applyNewFont2GlobalDom = (fontFamily: string, fontUrl: string) => {
  return new Promise((resolve, reject) => {
    if ("add" in document.fonts) {
      const fontFace = new FontFace(fontFamily, fontUrl);
      fontFace.load().then(
        (loadedFont) => {
          // @ts-ignore
          document.fonts.add(loadedFont);
          resolve(loadedFont);
        },
        (reason) => {
          reject(reason);
        }
      );
    } else {
      // 如果浏览器不支持FontFace方法，直接添加样式到页面
      try {
        const styleElement = createFontFaceCssStyleElement(fontFamily, fontUrl);
        document.getElementsByTagName("head")[0].appendChild(styleElement);
        resolve(styleElement);
      } catch (e) {
        reject(e);
      }
    }
  });
};

export const isDifferentArray = function (aaList: number[], bbList: number[]): boolean {
  if (aaList.length !== bbList.length) {
    return true;
  }

  const isDifferent = (a: number | undefined, b: number | undefined): boolean => {
    if (typeof a === "undefined" || typeof b === "undefined") {
      return true;
    }

    return a !== b;
  };

  const sliceMin = 16;
  let status = [];
  let statusTmp = [];
  let count = 0;

  status.push({ L: 0, R: aaList.length - 1 });
  while (count < aaList.length) {
    const currentStatusArrayLength = status.length;
    for (let i = 0; i < currentStatusArrayLength; i += 1) {
      const item = status[i] as any;
      let isEndOfLife = false;
      if (isDifferent(aaList[item.L], bbList[item.L]) || isDifferent(aaList[item.R], bbList[item.R])) {
        return true;
      }
      if (item.L + 1 < item.R) {
        count += 2;
        item.L += 1;
        item.R -= 1;
        // 是否达到二分阈值？假如区间（不包括自己）仍至少有 二分阈值 个元素，那么便二分
        if (item.L + sliceMin < item.R) {
          const total = (item.L + item.R) as number;
          // const mid = Math.floor((item.L + item.R) / 2);
          const mid = (total & 0x1) === 1 ? (total - 1) >> 1 : total >> 1;
          statusTmp.push({ L: mid + 1, R: item.R });
          item.R = mid;
        }
      } else if (item.L + 1 === item.R) {
        count += 2;
      } else {
        count += 1;
        isEndOfLife = true;
      }
      if (!isEndOfLife) {
        statusTmp.push(status[i]);
      }
    }

    status = statusTmp;
    statusTmp = [];
  }

  return false;
};

export const getBrowserFirstDefaultFontFamily = () => {
  return parseFontFamilyAndGetTheFirstOne(
    window.getComputedStyle(document.documentElement).fontFamily,
    "serif"
  );
};

const renderFontChar = function (
  fontName: string,
  defaultFontName: string,
  testChar: string,
  canvas: HTMLCanvasElement
): number[] {
  const canvasContext = canvas.getContext("2d", {
    alpha: true,
    willReadFrequently: true
  }) as CanvasRenderingContext2D;
  const width = canvas.width;
  const height = canvas.height;
  const fontSize = width;
  canvasContext.clearRect(0, 0, width, height);
  canvasContext.textAlign = "center";
  canvasContext.fillStyle = "black";
  canvasContext.textBaseline = "middle";
  // 字体是传入的j,或者是默认的h
  canvasContext.font = fontSize + "px " + fontName + ", " + defaultFontName;
  canvasContext.fillText(testChar, width / 2, height / 2);
  return [...canvasContext.getImageData(0, 0, width, height).data];
  // return new Uint8Array(canvasContext.getImageData(0, 0, width, height).data);
  // return canvasContext.getImageData(0, 0, width, height).data;
};

export class SupportedFontFamilyDetector {
  defaultFontName: string | undefined;

  testChar: string = "a";

  defaultFontCanvas: HTMLCanvasElement = document.createElement("canvas");

  selectedFontCanvas: HTMLCanvasElement = document.createElement("canvas");

  isSupported = (fontName: string) => {
    const myself = this;
    const theDefaultFontName =
      typeof myself.defaultFontName === "undefined"
        ? getBrowserFirstDefaultFontFamily()
        : myself.defaultFontName;

    if (fontName.toLowerCase() === theDefaultFontName.toLowerCase()) {
      return true;
    }

    const defaultFontImage = renderFontChar(
      theDefaultFontName,
      theDefaultFontName,
      myself.testChar,
      myself.defaultFontCanvas
    );
    const customFontImage = renderFontChar(
      fontName,
      theDefaultFontName,
      myself.testChar,
      myself.selectedFontCanvas
    );
    return isDifferentArray(defaultFontImage, customFontImage);
  };
}

export const isSupportedFontFamily = function (
  fontName: string,
  defaultFontName: string | undefined
): boolean {
  const detector = new SupportedFontFamilyDetector();
  detector.defaultFontName = defaultFontName;
  return detector.isSupported(fontName);
};

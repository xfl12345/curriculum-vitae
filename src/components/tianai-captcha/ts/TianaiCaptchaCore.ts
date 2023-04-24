import { CaptchaConfig } from "./CaptchaConfig";

export class TianaiCaptchaCore {
  isPrintLog: boolean = true;

  currentCaptchaConfig: CaptchaConfig;

  doDown: (config: CaptchaConfig) => any;

  doMove: (config: CaptchaConfig) => any;

  valid: (config: CaptchaConfig) => any;

  constructor(
    captchaConfig: CaptchaConfig,
    doDown: (config: CaptchaConfig) => any | void,
    doMove: (config: CaptchaConfig) => any | void,
    valid: (config: CaptchaConfig) => void
  ) {
    this.currentCaptchaConfig = captchaConfig;
    this.doDown = doDown;
    this.doMove = doMove;
    this.valid = valid;
  }

  // eslint-disable-next-line class-methods-use-this
  clearPreventDefault = (event: Event) => {
    if (event.preventDefault) {
      event.preventDefault();
    }
  };

  clearAllPreventDefault = (divDom: HTMLDivElement) => {
    const myself = this;
    divDom.childNodes.forEach((el) => {
      el.addEventListener("touchmove", myself.clearPreventDefault, false);
    });
  };

  reductionAllPreventDefault = (divDom: HTMLDivElement) => {
    const myself = this;
    divDom.childNodes.forEach((el) => {
      el.removeEventListener("touchmove", myself.clearPreventDefault);
    });
  };

  printLog = (...params: any[]) => {
    if (this.isPrintLog) {
      console.log(JSON.stringify(params));
    }
  };

  initConfig = (
    bgImageWidth: number,
    bgImageHeight: number,
    sliderImageWidth: number,
    sliderImageHeight: number,
    end: number
  ) => {
    const myself = this;
    const currentCaptchaConfig = myself.currentCaptchaConfig;
    const printLog = myself.printLog;

    myself.currentCaptchaConfig = {
      startTime: new Date(),
      trackArr: [],
      movePercent: 0,
      bgImageWidth,
      bgImageHeight,
      sliderImageWidth,
      sliderImageHeight,
      end
    };
    printLog("init", currentCaptchaConfig);
    return currentCaptchaConfig;
  };

  down = (event: MouseEvent | TouchEvent) => {
    const myself = this;
    const currentCaptchaConfig = myself.currentCaptchaConfig;
    const printLog = myself.printLog;
    const move = myself.move;
    const up = myself.up;
    const doDown = myself.doDown;

    let startX: number;
    let startY: number;
    if (event instanceof TouchEvent) {
      // event.preventDefault();
      const targetTouches = event.targetTouches;
      startX = Math.round(targetTouches[0].pageX!);
      startY = Math.round(targetTouches[0].pageY!);
    } else {
      startX = event.pageX!;
      startY = event.pageY!;
    }
    currentCaptchaConfig.startX = startX;
    currentCaptchaConfig.startY = startY;

    const pageX = currentCaptchaConfig.startX!;
    const pageY = currentCaptchaConfig.startY!;
    const startTime = currentCaptchaConfig.startTime;
    const trackArr = currentCaptchaConfig.trackArr;
    trackArr.push({
      x: pageX - startX,
      y: pageY - startY,
      type: "down",
      t: new Date().getTime() - startTime.getTime()
    });
    printLog("start", startX, startY);
    // pc
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    // 手机端
    window.addEventListener("touchmove", move, false);
    window.addEventListener("touchend", up, false);
    doDown(currentCaptchaConfig);
  };

  move = (event: MouseEvent | TouchEvent) => {
    const myself = this;
    const currentCaptchaConfig = myself.currentCaptchaConfig;
    const printLog = myself.printLog;
    const doMove = myself.doMove;

    const touch = {
      pageX: 0,
      pageY: 0
    };
    if (event instanceof TouchEvent) {
      // event.preventDefault();
      const touchEventItem = event.touches[0];
      touch.pageX = touchEventItem.pageX;
      touch.pageY = touchEventItem.pageY;
    } else {
      touch.pageX = event.pageX;
      touch.pageY = event.pageY;
    }
    const pageX = Math.round(touch.pageX);
    const pageY = Math.round(touch.pageY);
    const startX = currentCaptchaConfig.startX!;
    const startY = currentCaptchaConfig.startY!;
    const startTime = currentCaptchaConfig.startTime;
    const end = currentCaptchaConfig.end;
    const bgImageWidth = currentCaptchaConfig.bgImageWidth;
    const trackArr = currentCaptchaConfig.trackArr;
    let moveX = pageX - startX;
    const track = {
      x: pageX - startX,
      y: pageY - startY,
      type: "move",
      t: new Date().getTime() - startTime.getTime()
    };
    trackArr.push(track);
    if (moveX < 0) {
      moveX = 0;
    } else if (moveX > end) {
      moveX = end;
    }
    currentCaptchaConfig.moveX = moveX;
    currentCaptchaConfig.movePercent = moveX / bgImageWidth;
    doMove(currentCaptchaConfig);
    printLog("move", track);
  };

  up = (event: MouseEvent | TouchEvent) => {
    const myself = this;
    const currentCaptchaConfig = myself.currentCaptchaConfig;
    const printLog = myself.printLog;
    const move = myself.move;
    const up = myself.up;
    const valid = myself.valid;

    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
    window.removeEventListener("touchmove", move);
    window.removeEventListener("touchend", up);
    const touch = {
      pageX: 0,
      pageY: 0
    };
    if (event instanceof TouchEvent) {
      event.preventDefault();
      const touchEventItem = event.changedTouches[0];
      touch.pageX = touchEventItem.pageX;
      touch.pageY = touchEventItem.pageY;
    } else {
      touch.pageX = event.pageX;
      touch.pageY = event.pageY;
    }
    currentCaptchaConfig.stopTime = new Date();
    const pageX = Math.round(touch.pageX);
    const pageY = Math.round(touch.pageY);
    const startX = currentCaptchaConfig.startX!;
    const startY = currentCaptchaConfig.startY!;
    const startTime = currentCaptchaConfig.startTime;
    const trackArr = currentCaptchaConfig.trackArr;

    const track = {
      x: pageX - startX,
      y: pageY - startY,
      type: "up",
      t: new Date().getTime() - startTime.getTime()
    };

    trackArr.push(track);
    printLog("up", track);
    valid(currentCaptchaConfig);
  };
}

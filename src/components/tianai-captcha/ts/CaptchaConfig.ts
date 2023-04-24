export class CaptchaConfig {
  startTime: Date = new Date();

  stopTime?: Date;

  trackArr: any[] = [];

  bgImageWidth: number = 0;

  bgImageHeight: number = 0;

  sliderImageWidth: number = 0;

  sliderImageHeight: number = 0;

  end: number = 0;

  startX?: number;

  startY?: number;

  moveX?: number;

  movePercent?: number = 0;
}

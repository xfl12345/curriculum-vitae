import { Step } from "./Step";

export class ImageCaptchaTrack {
  bgImageWidth?: number;

  bgImageHeight?: number;

  sliderImageWidth?: number;

  sliderImageHeight?: number;

  startSlidingTime?: Date;

  entSlidingTime?: Date;

  trackList?: Step[];
}

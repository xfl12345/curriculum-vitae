import { Point2D } from "./Point";
import { Step } from "./Step";

export class TianaiTrackEvent {
  startTime?: Date;

  stopTime?: Date;

  tracks: Step[] = [];

  startPoint?: Point2D;

  moveX: number = 0;

  movePercent: number = 0;
}

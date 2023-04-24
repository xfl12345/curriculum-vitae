export class Point2D {
  x: number;

  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export const getPoint2DFromMouseEvent = (event: MouseEvent, round: boolean): Point2D => {
  return new Point2D(
    round ? Math.round(event.pageX) : event.pageX,
    round ? Math.round(event.pageY) : event.pageY
  );
};

export const getPoint2DFromTouchEvent = (event: TouchEvent, round: boolean): Point2D => {
  const touch = event.type === "touchend" ? event.changedTouches[0] : event.targetTouches[0];
  return new Point2D(
    round ? Math.round(touch.pageX) : touch.pageX,
    round ? Math.round(touch.pageY) : touch.pageY
  );
};

export class TripleItemLog<T> {
  arr: T[] = [];

  push = (item: T) => {
    const myself = this;
    const theArray = myself.arr;

    switch (theArray.length) {
      case 3:
      case 2:
        theArray[2] = theArray[1];
      // eslint-disable-next-line no-fallthrough
      case 1:
        theArray[1] = theArray[0];
      // eslint-disable-next-line no-fallthrough
      case 0:
        theArray[0] = item;
      // eslint-disable-next-line no-fallthrough
      default:
        break;
    }
  };

  getFirst = () => (this.arr.length > 0 ? this.arr[0] : null);

  getMiddle = () => (this.arr.length >= 2 ? this.arr[1] : null);

  getLast = () => (this.arr.length > 0 ? this.arr[this.arr.length - 1] : null);

  getSize = () => this.arr.length;

  clear = () => {
    this.arr = [];
  };
}

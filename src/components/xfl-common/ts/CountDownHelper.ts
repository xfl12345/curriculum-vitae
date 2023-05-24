export class CountDownHelper {
  timer: any;

  timeout: number = 2000;

  estimatedTimeOfArrival: number = 2000;

  interval: number = 1000;

  currentStatus: string = "";

  start = (callback: (eta: number) => void) => {
    const myself = this;
    myself.estimatedTimeOfArrival = myself.timeout;

    return new Promise<boolean>((resolve, reject) => {
      if (myself.currentStatus !== "") {
        resolve(false);
      } else {
        myself.currentStatus = "running";
        myself.timer = setInterval(() => {
          if (myself.currentStatus !== "running") {
            clearInterval(myself.timer);
            myself.currentStatus = "";
            resolve(false);
          } else {
            myself.estimatedTimeOfArrival -= myself.interval;
            callback(myself.estimatedTimeOfArrival);
            if (myself.estimatedTimeOfArrival <= 0) {
              clearInterval(myself.timer);
              myself.currentStatus = "";
              resolve(true);
            }
          }
        }, myself.interval);
      }
    });
  };

  cancel = () => {
    const myself = this;
    myself.currentStatus = "stopping";
  };
}

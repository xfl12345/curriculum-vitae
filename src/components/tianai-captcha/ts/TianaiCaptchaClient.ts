import axios, { AxiosResponse } from "axios";
import { ImageCaptchaTrack } from "./ImageCaptchaTrack";

export interface ITianaiCaptchaClient {
  backgroundImage: string;

  sliderImage: string;

  captchaType: string;

  getCurrentCaptchaId: () => string;

  getSucceedValidationIdList: () => string[];

  clearSucceedValidationIdList: () => void;

  refresh: () => Promise<AxiosResponse>;

  validate: (data: ImageCaptchaTrack) => Promise<boolean>;
}

export class TianaiCaptchaClient implements ITianaiCaptchaClient {
  currentCaptchaId: string = "";

  succeedValidationIds: Map<string, string> = new Map<string, string>();

  backgroundImage: string = "";

  sliderImage: string = "";

  captchaType: string = "ROTATE";

  backendRequestPath = {
    refresh: "gen",
    validate: "check",
    recheckCaptchaIdStatus: "check2"
  };

  getCurrentCaptchaId = () => this.currentCaptchaId;

  getSucceedValidationIdList = () => Array.from(this.succeedValidationIds.values());

  clearSucceedValidationIdList = () => this.succeedValidationIds.clear();

  refresh = () => {
    const myself = this;
    return new Promise<AxiosResponse>((resolve, reject) => {
      axios.get(myself.backendRequestPath.refresh + "?type=" + myself.captchaType).then((response) => {
        if (response.status === 200) {
          const data = response.data;
          myself.currentCaptchaId = data.id;
          myself.backgroundImage = data.captcha.backgroundImage;
          myself.sliderImage = data.captcha.sliderImage;
          resolve(response.data);
          // console.log(data);
        } else {
          reject(response);
        }
      }, reject);
    });
  };

  validate = (data: ImageCaptchaTrack) => {
    const myself = this;
    const captchaId = myself.currentCaptchaId;
    return new Promise<boolean>((resolve, reject) => {
      axios
        .post(myself.backendRequestPath.validate + "?id=" + captchaId, data, {
          headers: {
            "Content-Type": "application/json"
          }
        })
        .then((response) => {
          const isPassed = response.data;
          if (isPassed) {
            myself.succeedValidationIds.set(captchaId, captchaId);
          }
          resolve(isPassed);
        }, reject);
    });
  };

  recheckCaptchaIdStatus = (captchaId: string) => {
    const myself = this;
    return new Promise<boolean>((resolve, reject) => {
      axios.get(myself.backendRequestPath.recheckCaptchaIdStatus + "?id=" + captchaId).then((response) => {
        const isPassed = response.data;
        if (!isPassed) {
          myself.succeedValidationIds.delete(captchaId);
        }
        resolve(isPassed);
      }, reject);
    });
  };
}

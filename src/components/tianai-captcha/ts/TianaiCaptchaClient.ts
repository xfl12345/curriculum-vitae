import axios, { AxiosError, AxiosResponse } from "axios";
import { ImageCaptchaTrack } from "./ImageCaptchaTrack";

export interface RequestResult {
  success: boolean;

  payload: any;
}

export interface ITianaiCaptchaClient {
  backgroundImage: string;

  sliderImage: string;

  captchaType: string;

  getCurrentCaptchaId: () => string;

  getSucceedVerificationIdList: () => string[];

  clearSucceedVerificationIdList: () => void;

  refresh: () => Promise<RequestResult>;

  validate: (data: ImageCaptchaTrack) => Promise<RequestResult>;

  recheckCaptchaIdStatus: (captchaId: string) => Promise<boolean>;

  getReasonInText: (error: AxiosError) => string;

  getRequestResult: (response: AxiosResponse) => RequestResult;

  verificationPayloadSupplier: () => Promise<any>;
}

export class TianaiCaptchaClient implements ITianaiCaptchaClient {
  currentCaptchaId: string = "";

  succeedVerificationIds: Map<string, string> = new Map<string, string>();

  backgroundImage: string = "";

  sliderImage: string = "";

  captchaType: string = "ROTATE";

  backendRequestPath = {
    refresh: "gen",
    validate: "check",
    recheckCaptchaIdStatus: "check2"
  };

  getCurrentCaptchaId = () => this.currentCaptchaId;

  getSucceedVerificationIdList = () => Array.from(this.succeedVerificationIds.values());

  clearSucceedVerificationIdList = () => this.succeedVerificationIds.clear();

  refresh = () => {
    const myself = this;
    return new Promise<RequestResult>((resolve, reject) => {
      axios.get(myself.backendRequestPath.refresh + "?type=" + myself.captchaType).then((response) => {
        const data = response.data;
        myself.currentCaptchaId = data.id;
        myself.backgroundImage = data.captcha.backgroundImage;
        myself.sliderImage = data.captcha.sliderImage;
        resolve({
          success: true,
          payload: response.data
        });
      }, reject);
    });
  };

  validate = (data: ImageCaptchaTrack) => {
    const myself = this;
    const captchaId = myself.currentCaptchaId;
    return myself.verificationPayloadSupplier().then((payload) => {
      data.data = payload;
      return new Promise<RequestResult>((resolve, reject) => {
        axios
          .post(myself.backendRequestPath.validate + "?id=" + captchaId, data, {
            headers: {
              "Content-Type": "application/json"
            }
          })
          .then((response) => {
            const requestResult: RequestResult = myself.getRequestResult(response);
            if (requestResult.success) {
              myself.succeedVerificationIds.set(captchaId, captchaId);
            }
            resolve(requestResult);
          }, reject);
      });
    });
  };

  recheckCaptchaIdStatus = (captchaId: string) => {
    const myself = this;
    return new Promise<boolean>((resolve, reject) => {
      axios.get(myself.backendRequestPath.recheckCaptchaIdStatus + "?id=" + captchaId).then((response) => {
        const isPassed = response.data;
        if (!isPassed) {
          myself.succeedVerificationIds.delete(captchaId);
        }
        resolve(isPassed);
      }, reject);
    });
  };

  // eslint-disable-next-line class-methods-use-this
  getReasonInText = (error: AxiosError) =>
    "请求失败。原因未知。代码：" +
    (typeof error.response !== "undefined" ? error.response.statusText : error.code);

  // eslint-disable-next-line class-methods-use-this
  getRequestResult = (response: AxiosResponse<any, any>) => {
    return {
      success: response.status >= 200 && response.status < 300 && response.data,
      payload: response.data
    };
  };

  // eslint-disable-next-line class-methods-use-this
  verificationPayloadSupplier = () => {
    return new Promise<any>((resolve, reject) => {
      resolve({});
    });
  };
}

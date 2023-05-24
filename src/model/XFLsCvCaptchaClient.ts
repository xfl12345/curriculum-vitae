import { TianaiCaptchaClient } from "../components/tianai-captcha/ts/TianaiCaptchaClient";

export class XFLsCvCaptchaClient extends TianaiCaptchaClient {
  constructor() {
    super();
    const captchaApiRequstBase = "captcha";
    const myself = this;
    myself.backendRequestPath.refresh = captchaApiRequstBase + "/generate";
    myself.backendRequestPath.validate = captchaApiRequstBase + "/check";
    myself.backendRequestPath.recheckCaptchaIdStatus = captchaApiRequstBase + "/check2";

    const getReasonInTextDefaultImpl = myself.getReasonInText;
    myself.getReasonInText = (error) => {
      let reason = getReasonInTextDefaultImpl(error);
      if (typeof error.response !== "undefined") {
        const response = error.response;
        if ("headers" in response && "data" in response) {
          const payload: any = response.data;
          if (typeof payload !== "undefined") {
            reason = "";
            if ("message" in payload) {
              reason += "消息：" + payload.message + "\n";
            }
            if ("code" in payload) {
              reason += "状态码：" + payload.code + "\n";
            }
            if ("data" in payload && "coolDownRemainder" in payload.data) {
              reason += "冷却剩余时间：" + (payload.data.coolDownRemainder * 1.0) / 1000 + "秒\n";
            }
          }
        }
      }

      return reason;
    };

    myself.getRequestResult = (response) => {
      return {
        success: typeof response.data !== "undefined" && response.data.success,
        payload: response.data
      };
    };
  }
}

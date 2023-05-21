import { TianaiCaptchaClient } from "../components/tianai-captcha/ts/TianaiCaptchaClient";

export class XFLsCvCaptchaClient extends TianaiCaptchaClient {
  constructor() {
    super();
    const captchaApiRequstBase = "captcha";
    const myself = this;
    myself.backendRequestPath.refresh = captchaApiRequstBase + "/generate";
    myself.backendRequestPath.validate = captchaApiRequstBase + "/check";
    myself.backendRequestPath.recheckCaptchaIdStatus = captchaApiRequstBase + "/check2";

    myself.options.getReasonInText = (response) => {
      let reason = "";
      if ("headers" in response && "data" in response.data) {
        const data = response.data;
        if ("message" in data) {
          reason += "消息：" + data.message + "\n";
        }
        if ("code" in data) {
          reason += "状态码：" + data.code + "\n";
        }
        if ("data" in data && "coolDownRemainder" in data.data) {
          reason += "冷却剩余时间：" + (data.data.coolDownRemainder * 1.0) / 1000 + "秒\n";
        }
      } else {
        reason = "刷新失败。原因未知。";
      }

      return reason;
    };
  }
}

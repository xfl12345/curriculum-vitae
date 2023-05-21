import { TianaiCaptchaClient } from "../components/tianai-captcha/ts/TianaiCaptchaClient";

export class XFLsCvCaptchaClient extends TianaiCaptchaClient {
  constructor() {
    super();
    const captchaApiRequstBase = "captcha";
    const myself = this;
    myself.backendRequestPath.refresh = captchaApiRequstBase + "/generate";
    myself.backendRequestPath.validate = captchaApiRequstBase + "/check";
    myself.backendRequestPath.recheckCaptchaIdStatus = captchaApiRequstBase + "/check2";
  }
}

import axios from "axios";
import { SaTokenResult } from "./SaTokenResult";

export class LoginMananger {
  phoneNumber: string = "";

  loginViaSms = (phoneNumber: string, verificationCode: string) => {
    const myself = this;
    myself.phoneNumber = phoneNumber;

    return new Promise<SaTokenResult>((resolve, reject) => {
      axios
        .post("login", {
          phoneNumber,
          verificationCode
        })
        .then(
          (value) => resolve(value.data),
          (reason) => reject(reason)
        );
    });
  };

  isAlreadyLogin = (): Promise<boolean> => {
    const myself = this;

    return new Promise<boolean>((resolve, reject) => {
      axios.get("login/status").then(
        (value) => resolve(value.data),
        (reason) => reject(reason)
      );
    });
  };
}

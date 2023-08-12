import axios from "axios";
import { IJsonApiResponseData } from "@/model/JsonApiResponseData";

export class LoginMananger {
  phoneNumber: string = "";

  loginViaSms = (phoneNumber: string, verificationCode: string) => {
    const myself = this;
    myself.phoneNumber = phoneNumber;

    return new Promise<IJsonApiResponseData>((resolve, reject) => {
      axios
        .post(
          "login",
          {
            phoneNumber,
            verificationCode
          },
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            }
          }
        )
        .then(
          (response) => resolve(response.data),
          (reason) => reject(reason)
        );
    });
  };

  isAlreadyLogin = (): Promise<boolean> => {
    const myself = this;

    return new Promise<boolean>((resolve, reject) => {
      axios.get("login/status").then(
        (response) => resolve(response.data),
        (reason) => reject(reason)
      );
    });
  };

  logout = () => {
    const myself = this;

    return new Promise<boolean>((resolve, reject) => {
      axios.post("logout").then(
        (response) => resolve(response.data),
        (reason) => reject(reason)
      );
    });
  };
}

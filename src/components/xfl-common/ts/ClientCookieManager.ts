export const getTargetKvFromDocumentCookie = (targetFieldName: string) => {
  const targetKvList = document.cookie
    .split(";")
    .filter((value, index, array) => value.startsWith(targetFieldName + "="));
  return targetKvList.length > 0 ? targetKvList[0] : "";
};

export const currentCookieKey = "xflsV1Cookie";

export class ClientCookieManager {
  clientCookie: any;

  reloadCookie = () => {
    const kvString = getTargetKvFromDocumentCookie(currentCookieKey);
    this.clientCookie = kvString === "" ? {} : JSON.parse(kvString.slice(currentCookieKey.length + 1));
  };

  saveCookie = () => {
    const myself = this;
    const expires = getTargetKvFromDocumentCookie("expires");
    document.cookie = currentCookieKey + "=" + JSON.stringify(myself.clientCookie) + ";" + expires;
  };
}

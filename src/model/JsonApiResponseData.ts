export interface IGenericJsonApiResponseData<T> {
  success: boolean;
  version: string;
  message: string;
  code: number;
  data: T;
}

export interface IJsonApiResponseData extends IGenericJsonApiResponseData<any> {}

export interface RateLimitedApiResultPayload {
  coolDownRemainder: number;
}

import axios, { AxiosError } from "axios";
import { CurriculumVitaeData } from "@/tsmod/CurriculumVitaeData";

export const secretDataApiBasePath = "/static/secret/";

export function getCurriculumVitaeData(): Promise<Partial<CurriculumVitaeData>> {
  return new Promise<Partial<CurriculumVitaeData>>(
    (resolve: (cvData: Partial<CurriculumVitaeData>) => void, reject: (reason: any) => void) => {
      axios
        .get("." + secretDataApiBasePath + "json/xflsCurriculumVitaeData.json", {
          headers: { "Cache-Control": "no-cache" }
        })
        .then(
          (response) => {
            const responseData = response.data;
            resolve(responseData);
          },
          (reason: AxiosError) => {
            reject(reason);
          }
        );
    }
  );
}

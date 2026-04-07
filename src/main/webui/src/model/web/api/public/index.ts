import { httpClient } from '../common'

export interface PublicWebUiData {
  textOfChinaICP?: string
  backgroundPathOfIndexPage?: string
}

export function getPublicWebUiData(): Promise<PublicWebUiData> {
  return httpClient.Get<PublicWebUiData>('/public/json/publicWebUiData.json')
}

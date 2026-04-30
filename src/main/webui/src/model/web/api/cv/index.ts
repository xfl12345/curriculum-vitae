import MockCvDataJson from '/mock/cv-data.json?url&no-inline'

import type { CurriculumVitaeData } from '@/model/business'

import { httpClient } from '../common'

export function getCvDataFromBackend() {
  return httpClient.Get<CurriculumVitaeData>('/cv/data')
}

/**
 * Fetch CV data. Anonymous mode uses plain fetch() (not Alova httpClient)
 * because httpClient prepends baseURL (/api/v1) which would break static file paths.
 */
export async function getCvData(isAnonymous: boolean): Promise<CurriculumVitaeData> {
  if (isAnonymous) {
    const resp = await fetch(MockCvDataJson)
    return resp.json()
  }

  return getCvDataFromBackend()
}

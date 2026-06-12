import { httpClient } from '../common'

export interface MeetHr {
  id?: number
  createTime?: string
  firstVisitTime?: string | null
  lastVisitTime?: string | null
  hrName: string
  hrPhoneNumber: string
  hrJob: string
  myJob: string
  note: string
}

export interface PageData<T> {
  total: number
  data: T[]
}

export function getMeetHrPage(pageIndex: number, pageSize: number) {
  return httpClient.Get<PageData<MeetHr>>('/users/page', { params: { pageIndex, pageSize } })
}

export function getMeetHrCount() {
  return httpClient.Get<number>('/users/count')
}

export function getMeetHrById(id: number) {
  return httpClient.Get<MeetHr>(`/users/${id}`)
}

export function addMeetHr(meetHr: MeetHr) {
  return httpClient.Post<boolean>('/users', meetHr)
}

export function updateMeetHr(id: number, meetHr: MeetHr) {
  return httpClient.Put<boolean>(`/users/${id}`, meetHr)
}

export function deleteMeetHr(id: number) {
  return httpClient.Delete<boolean>(`/users/${id}`)
}

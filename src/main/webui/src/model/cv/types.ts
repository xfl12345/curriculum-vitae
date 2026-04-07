export interface ValuePair {
  theDisplayValue?: string
  theCopyValue: string
}

export interface SkillDegree {
  skillName: string
  degree: number
}

export interface BasicInformation {
  name?: ValuePair
  phoneNumberSameToWechat?: ValuePair
  emailAddress?: ValuePair
  birthdayInYearAndMonth?: ValuePair
  maritalStatus?: ValuePair
  jobPrefer: ValuePair
  nation?: ValuePair
  stature?: ValuePair
  schooling?: ValuePair
  lastInstitute?: ValuePair
  nativePlace?: ValuePair
  facePhoto: string
}

export interface CommunityData {
  communityUrlList: string[]
  weChatHeadPhoto: string
  wechatUrl: string
  curriculumVitaeSourceCodeUrl: string
}

export interface JourneyItem {
  id: number
  period: string
  headerCenter: string
  headerRight: string
  body?: string
}

export interface ProjectExperienceItemData {
  id: number
  period: string
  name: string
  technologyStack: string
  body?: string
}

export interface OnlyContentItem {
  id: number
  content: string
}

export interface CurriculumVitaeData {
  basicInformation: BasicInformation
  community: CommunityData
  skillDegree: SkillDegree[]
  journey: JourneyItem[]
  projectExperience: ProjectExperienceItemData[]
  certificate: OnlyContentItem[]
  interestingBlog: OnlyContentItem[]
  selfAppraisal: string
}

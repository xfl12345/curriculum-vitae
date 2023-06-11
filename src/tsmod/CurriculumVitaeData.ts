import { SkillDegree } from "./SkillDegree";
import { ValuePair } from "./ValuePair";

export interface JourneyItem {
  id: number;
  period: string;
  headerCenter: string;
  headerRight: string;
  body?: string;
}

export interface OnlyContentItem {
  id: number;
  content: string;
}

// export

export interface BasicInformation {
  name?: ValuePair;
  phoneNumberSameToWechat?: ValuePair;
  emailAddress?: ValuePair;
  birthdayInYearAndMonth?: ValuePair;
  maritalStatus?: ValuePair;
  jobPrefer?: ValuePair;
  nation?: ValuePair;
  stature?: ValuePair;
  schooling?: ValuePair;
  lastInstitute?: ValuePair;
  nativePlace?: ValuePair;
  facePhoto?: string;
  [propName: string]: any;
}

export class CurriculumVitaeData {
  basicInformation: BasicInformation = {};

  community: object = {};

  skillDegree: SkillDegree[] = [];

  journey: JourneyItem[] = [];

  certificate: OnlyContentItem[] = [];

  interestingBlog: OnlyContentItem[] = [];

  selfAppraisal: string = "";
}

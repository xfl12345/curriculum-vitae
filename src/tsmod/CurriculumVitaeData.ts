import { SkillDegree } from "./SkillDegree";

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

export class CurriculumVitaeData {
  basicInformation: object = {};

  community: object = {};

  skillDegree: SkillDegree[] = [];

  journey: JourneyItem[] = [];

  certificate: OnlyContentItem[] = [];

  interestingBlog: OnlyContentItem[] = [];

  selfAppraisal: string = "";
}

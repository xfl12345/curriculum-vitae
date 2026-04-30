import type { BasicInformation, CurriculumVitaeData } from '@/model/business'

export const cvPageTitle = {
  basicInformation: '基本信息',
  community: '交个朋友',
  journey: '履历',
  projectExperience: '项目经历',
  certificate: '技能证书',
  skillDegree: '技能水平',
  interestingBlog: '折腾碎念',
  selfAppraisal: '自我评价',
} as const satisfies Record<keyof CurriculumVitaeData, string>

export const cvBasicInformation = {
  name: '姓名',
  phoneNumberSameToWechat: '手机/微信',
  emailAddress: '邮箱',
  birthdayInYearAndMonth: '出生年月',
  maritalStatus: '婚姻状况',
  jobPrefer: '求职意向',
  nation: '民族',
  stature: '身高',
  schooling: '学历',
  lastInstitute: '毕业院校',
  nativePlace: '籍贯',
  facePhoto: '头像',
} as const satisfies Record<keyof BasicInformation, string>

export default {
  template: {},
  static: {
    message: {
      pleaseEnter: '请输入',
      clickMe2Get: '点我获取',
      loginSucceed: '登录成功',
      loginFailed: '登录失败',
    },
    word: {
      welcome: '欢迎',
      phoneNumber: '手机号',
      verificationCode: '验证码',
      login: '登录',
      anonymousEntry: '游客入口',
      logout: '注销',
    },
    cvBasicInformation,
    cvPageTitle,
  },
}

import type { MeetHr, PageData } from '@/model/web/api/meet-hr'

/**
 * 前端 mock 数据源：模拟后端 /api/v1/users/* 系列接口。
 * 用法：在 test 页面用 mockGetMeetHrPage 等替代真实 API，
 *      既不污染真实数据库，也能演示无限滚动 + hashmap 缓存。
 *
 * 数据池与命名风格参考 src/test/java/.../BatchUserInsertTool.java，
 * 保留同样的中文姓名/职位/备注模板，让数据看起来真实。
 */

const MOCK_TOTAL = 1000
const NETWORK_DELAY_MS = 50

const HR_NAMES = [
  '张伟',
  '王芳',
  '李娜',
  '刘洋',
  '陈静',
  '杨磊',
  '赵敏',
  '黄强',
  '周杰',
  '吴秀英',
  '徐明',
  '孙丽',
  '马超',
  '朱红',
  '胡建华',
  '郭俊杰',
  '何平',
  '高志远',
  '林涛',
  '罗小燕',
  '梁慧',
  '宋文',
  '郑鹏',
  '谢军',
  '韩雨',
  '唐晓',
  '冯刚',
  '董萍',
  '程思远',
  '曹雪梅',
  '袁磊',
  '邓超',
  '许晴',
  '傅海峰',
  '沈丽华',
  '曾庆',
  '彭丹',
  '吕明',
  '苏强',
  '蒋琳',
]

const HR_JOBS = [
  '技术总监',
  'HR经理',
  '产品经理',
  '前端工程师',
  '后端工程师',
  '项目经理',
  '技术经理',
  '架构师',
  'CTO',
  '招聘专员',
  'HRBP',
  '研发总监',
  '运维工程师',
  '数据工程师',
  '测试工程师',
  'UI设计师',
  '算法工程师',
  'DevOps工程师',
]

const MY_JOBS = [
  'Java开发工程师',
  '全栈开发工程师',
  '高级Java工程师',
  '后端开发工程师',
  '资深开发工程师',
  '技术专家',
  '软件工程师',
  '研发工程师',
]

const NOTE_TEMPLATES = [
  '通过猎头推荐认识',
  '在技术大会上结识',
  '朋友介绍',
  'LinkedIn上联系',
  '前同事',
  '技术社区认识',
  '校招面试官',
  '开源项目合作',
  '内部推荐',
  '技术分享会认识',
  '线上交流后约见',
  '行业论坛认识',
]

const PHONE_PREFIXES = [
  '130',
  '131',
  '132',
  '133',
  '135',
  '136',
  '137',
  '138',
  '139',
  '150',
  '151',
  '152',
  '153',
  '155',
  '156',
  '157',
  '158',
  '159',
  '170',
  '171',
  '172',
  '173',
  '175',
  '176',
  '177',
  '178',
  '180',
  '181',
  '182',
  '183',
  '185',
  '186',
  '187',
  '188',
  '189',
]

// ==================== 顺序递增辅助函数 ====================
// 按自然顺序生成数据，每条记录的字段都是确定性的，便于测试和调试

/** 按索引从池中循环选取（0-based） */
function pickByIndex<T>(index: number, pool: readonly T[]): T {
  return pool[index % pool.length]!
}

/** 按索引生成递增手机号：1300000001, 1300000002, ... */
function phoneNumberByIndex(index: number): string {
  const prefix = PHONE_PREFIXES[index % PHONE_PREFIXES.length]!
  const suffix = String(index + 1).padStart(8, '0')
  return prefix + suffix
}

/** 按索引生成递增时间戳：从基准时间开始，每条记录间隔 1 天 */
function dateTimeByIndex(index: number): string {
  // 基准时间：2025-01-01T00:00:00，每条记录间隔 1 天
  const baseTime = new Date(2025, 0, 1)
  const d = new Date(baseTime.getTime() + index * 24 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// ==================== Mock DB (module-level singleton Map) ====================

const mockDB = new Map<number, MeetHr>()
let nextId = 1

function ensureGenerated(): void {
  if (mockDB.size > 0) return
  for (let i = 1; i <= MOCK_TOTAL; i++) {
    const idx = i - 1 // 0-based 索引，用于顺序选取
    mockDB.set(i, {
      id: i,
      hrName: pickByIndex(idx, HR_NAMES),
      hrPhoneNumber: phoneNumberByIndex(idx),
      hrJob: pickByIndex(idx, HR_JOBS),
      myJob: pickByIndex(idx, MY_JOBS),
      note: pickByIndex(idx, NOTE_TEMPLATES),
      createTime: dateTimeByIndex(idx),
      firstVisitTime: null,
      lastVisitTime: null,
    })
  }
  nextId = MOCK_TOTAL + 1
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), NETWORK_DELAY_MS))
}

// ==================== Mock API（签名与 @/model/web/api/meet-hr 完全一致） ====================

export function mockGetMeetHrPage(pageIndex: number, pageSize: number): Promise<PageData<MeetHr>> {
  ensureGenerated()
  // pageIndex 1-based，与后端一致
  const start = (pageIndex - 1) * pageSize
  const all = Array.from(mockDB.values())
  const data = all.slice(start, start + pageSize)
  return delay({ total: mockDB.size, data })
}

export function mockGetMeetHrCount(): Promise<number> {
  ensureGenerated()
  return delay(mockDB.size)
}

export function mockAddMeetHr(meetHr: MeetHr): Promise<boolean> {
  ensureGenerated()
  const id = nextId++
  mockDB.set(id, {
    ...meetHr,
    id,
    createTime: new Date().toISOString().replace(/\.\d{3}Z$/, ''),
  })
  return delay(true)
}

export function mockUpdateMeetHr(id: number, meetHr: MeetHr): Promise<boolean> {
  ensureGenerated()
  mockDB.set(id, { ...meetHr, id })
  return delay(true)
}

export function mockDeleteMeetHr(id: number): Promise<boolean> {
  ensureGenerated()
  return delay(mockDB.delete(id))
}

/** 重置 mock 数据（开发调试用，可挂到 window 上） */
export function resetMockData(): void {
  mockDB.clear()
  nextId = 1
  ensureGenerated()
}

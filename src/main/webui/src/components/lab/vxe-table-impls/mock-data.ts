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

// ==================== Seeded PRNG (mulberry32) ====================
// 固定种子保证刷新页面后数据一致，便于 chrome-devtools 反复测试

function createRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(rand: () => number, pool: readonly T[]): T {
  return pool[Math.floor(rand() * pool.length)]!
}

function randomPhoneNumber(rand: () => number): string {
  const prefix = pick(rand, PHONE_PREFIXES)
  let suffix = ''
  for (let i = 0; i < 8; i++) {
    suffix += String(Math.floor(rand() * 10))
  }
  return prefix + suffix
}

function randomDateTimeString(rand: () => number): string {
  // 过去 365 天内随机时间，格式 YYYY-MM-DDTHH:MM:SS（无时区，匹配 formatIsoTime 的 PlainDateTime 解析）
  const now = Date.now()
  const offsetMs = Math.floor(rand() * 365 * 24 * 60 * 60 * 1000)
  const d = new Date(now - offsetMs)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// ==================== Mock DB (module-level singleton Map) ====================

const mockDB = new Map<number, MeetHr>()
let nextId = 1

function ensureGenerated(): void {
  if (mockDB.size > 0) return
  const rand = createRng(0x5eeded)
  const baseTime = randomDateTimeString(rand)
  for (let i = 1; i <= MOCK_TOTAL; i++) {
    mockDB.set(i, {
      id: i,
      hrName: pick(rand, HR_NAMES),
      hrPhoneNumber: randomPhoneNumber(rand),
      hrJob: pick(rand, HR_JOBS),
      myJob: pick(rand, MY_JOBS),
      note: pick(rand, NOTE_TEMPLATES),
      createTime: baseTime,
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

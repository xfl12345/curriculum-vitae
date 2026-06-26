<script setup lang="ts">
/**
 * Transform Trick 架构：transform-trick 无限滚动实现。
 *
 * 核心理念：零 DOM 挂载/卸载，只 transform 平移。
 *
 * 两层架构：
 * - 骨架层（SkeletonPanel × panelCount，z-index: 1）：始终即时响应用户滚动，
 *   显示「第 X 页」分割条 + 列形骨架。让 UI 闪电般响应。
 * - 数据层（DataPanel × panelCount，z-index: 2）：vxe-grid 实例固定不变，
 *   按滚动模式策略性更新——IN_RANGE 即时跟踪，OUT_OF_RANGE 冻结 + 300ms 节流刷新。
 *
 * 滚动模式判定（用缓存覆盖范围，而非速度）：
 * - IN_RANGE：当前可见的所有页都在 rowCache 内（cachedPageSet 命中），数据层即时跟踪
 * - OUT_OF_RANGE：可见页中有任何一页未缓存，视为超速滚动，数据层冻结等下次刷新
 *
 * 面板计数（动态）：panelCount = ceil(clientHeight / pageBlockHeight) × 3
 * - 可见页数 × 3 倍：1 倍视口 + 上下各 1 倍预备
 * - 让 firstVisiblePageIdx 处于面板数组「中间偏前」位置，下方有更多预备
 *
 * LRU 缓存：保留 10 页（MAX_CACHED_PAGES），驱逐距离视口最远的页
 *
 * CRUD：清缓存 → 强制 OUT_OF_RANGE → 骨架层接管 → 重新拉取 → 数据层刷新
 *
 * 与 InfinitePagesImpl 的本质差异：
 * - 后者：每页一个 grid 实例，跨页时 mount/unmount（vxe-grid 挂载开销 ~秒级）
 * - 本实现：固定 panelCount 个 grid 实例永远活着，只通过 transform 平移 + data 切换
 *
 * 性能目标：滚动 0 卡顿，DOM 节点数恒定，FPS 稳定 60
 */

import type { VxeGridProps } from 'vxe-table'

import { useEventListener, useResizeObserver } from '@vueuse/core'
import { NInputNumber, NSelect, NSwitch } from 'naive-ui'
import { computed, nextTick, onMounted, reactive, ref, useCssModule, watch } from 'vue'

import type { MeetHr } from '@/model/web/api/meet-hr'

import CrudToolbar from './CrudToolbar.vue'
import DataPanel from './DataPanel.vue'
import {
  mockAddMeetHr,
  mockDeleteMeetHr,
  mockGetMeetHrCount,
  mockGetMeetHrPage,
  mockUpdateMeetHr,
} from './mock-data'
import {
  buildMeetHrColumns,
  clamp,
  createEmptyMeetHr,
  FIXED_COLUMN_WIDTHS,
  FLEX_COLUMN_COUNT,
  ROW_HEIGHT,
} from './shared'
import SkeletonPanel from './SkeletonPanel.vue'

// ==================== 常量 ====================

/**
 * 滚动模式：根据当前可见页是否已缓存判定。
 *
 * 设计缘由：用字符串字面量类型（'IN_RANGE' | 'OUT_OF_RANGE'）会让每个使用点
 * 都散落魔法字符串，且没有 IDE 的"跳转到定义 / 重命名 / 检查遗漏"支持。
 * enum 既能做值（scrollMode computed 返回）、又能做类型（接口字段、函数签名），
 * 让"模式"这个概念在代码里有一个具名中心。
 */
enum ScrollMode {
  /**
   * 当前可见的所有页都在 rowCache 内（cachedPageSet 命中）。
   * 数据层即时跟踪 scrollTop——同 tick 让 dataScrollTop 跟上，无缝滚动。
   */
  IN_RANGE = 'IN_RANGE',
  /**
   * 可见页中有任何一页未缓存，视为超速滚动。
   * 数据层节流（300ms 一次），期间骨架层先闪电追到新位置显示 shimmer 兜底。
   */
  OUT_OF_RANGE = 'OUT_OF_RANGE',
}

/** 页分割条高度（与 SkeletonPanel/DataPanel 内部 CSS 严格一致） */
const DIVIDER_HEIGHT = 40
/** vxe-grid 表头高度 */
const HEADER_HEIGHT = 48
/** 双向预取页数：上下各预取 PRELOAD_RANGE 页（给数据层「提前备货」） */
const PRELOAD_RANGE = 2
/** OUT_OF_RANGE 模式刷新间隔：300ms 内的连续滚动视为「同一次超速」 */
const OUT_OF_RANGE_REFRESH_INTERVAL_MS = 300

// ==================== 状态 ====================

const scrollShellEl = ref<HTMLElement>()
const clientHeight = ref(0)
/** 骨架层用的实时滚动位置：onScroll 时立即更新，让骨架层闪电响应 */
const scrollTop = ref(0)
/**
 * 数据层用的滚动位置。
 * - IN_RANGE 时：onScroll 内立即赋值 = scrollTop，数据层同 tick 跟上
 * - OUT_OF_RANGE 时：每 300ms 在 refreshDataLayer 内赋值一次，节流避免显示空 grid
 *
 * 设计缘由：节流的本质是「数据层读 scrollTop 的频率」，而非「冻结 pageIdxs 快照」。
 * 把节流体现在 dataScrollTop 这个变量上，变量职责就清晰了——scrollTop 永远实时，
 * dataScrollTop 永远是「数据层最后一次承认要追到的位置」。
 */
const dataScrollTop = ref(0)
const pageSize = ref(50)
const total = ref(0)

/**
 * 全局行缓存：globalRowIdx(0-based) → 行数据。
 * 刻意按全局行号而非页号索引——pageSize 切换时缓存不会失效。
 * Map 不响应式：内部修改不触发 patch，由 dataVersion ref 显式 bump 触发 dataPanels 重算。
 */
const rowCache = new Map<number, MeetHr>()
/** 正在加载的页号集合：防止 watch 在 Promise resolve 前重复触发同一页请求 */
const loadingPages = new Set<number>()
/** 已完整缓存的页号集合：用于判断 IN_RANGE / OUT_OF_RANGE */
const cachedPageSet = new Set<number>()

const editingPageIdx = ref<number | null>(null)
const isEditing = ref(false)

const jumpTarget = ref(1)

/**
 * Demo 开关：隐藏数据层（z-index 2），露出底层骨架层（z-index 1）。
 *
 * 设计缘由：开发/演示时需要肉眼验证「骨架层确实即时追到新位置，数据层冻结在旧位置」
 * 的分层行为。普通用户看到的永远是数据层（不透明白底），无法观察骨架层的工作。
 * 切到隐藏模式可立即看到骨架层的 shimmer 占位和分割条。
 *
 * 编辑中锁开关：避免用户在编辑态隐藏数据层，丢失编辑视觉反馈。
 */
const showDataLayer = ref(true)

// ==================== 面板数组 ====================

/**
 * 面板 ID 列表：[0, 1, 2, ..., panelCount-1]。
 *
 * 仅当 panelCount 变化（窗口 resize）时重建——这是合理的开销。
 * 模板 v-for 用这个列表给骨架层/数据层 v-for，传 panelId 给每个面板。
 */
const panelIds = computed<number[]>(() => {
  const pc = panelCount.value
  const arr: number[] = []
  for (let i = 0; i < pc; i++) arr.push(i)
  return arr
})

/**
 * 列宽 class 字符串数组（编译时 hash 后的 CSS module class）。
 *
 * 设计缘由（列宽"声明在父组件，消费在子组件"）：
 * - 列宽是「表格布局策略」，骨架层（SkeletonPanel）和数据层（vxe-grid via buildMeetHrColumns）
 *   必须严格对齐，否则用户从骨架过渡到真实数据时会有「跳一下」的视觉抖动
 * - 把列宽 class 集中在父组件 <style module> 一处定义，子组件通过 prop 接收已 hash 的 class 字符串——
 *   改列宽只改父组件一处，所有骨架面板自动同步
 * - 数据层 vxe-grid 的列宽通过 buildMeetHrColumns() 共享同一组 FIXED_COLUMN_WIDTHS 数字，
 *   与本组 class 的 v-bind 引用同一个常量，进一步保证两层列宽数值一致
 *
 * 为什么用 useCssModule() 而非 $style.colKey 动态索引：
 * - template 里 $style 支持点号访问但不支持动态方括号索引（TS 类型会退化）
 * - useCssModule() 在 setup 里拿到 Record<string,string>，预先取出 class 字符串放进数组
 *
 * CSS module class 名是 hash 后的全局唯一字符串（如 `_colCheckbox_1a2b3c`），
 * 传给子组件后浏览器按 class 名匹配 <head> 里已注入的 CSS 规则——CSS 是全局的，
 * class 名只是被 hash 避免冲突，传递给子组件合法且零额外开销。
 */
const cssModule = useCssModule()
const columnClasses: string[] = []
columnClasses.push(cssModule.colCheckbox)
columnClasses.push(cssModule.colSeq)
// FLEX_COLUMN_COUNT 个文本列：复用同一个 colFlex class（flex:1 等分剩余宽度）
for (let i = 0; i < FLEX_COLUMN_COUNT; i++) {
  columnClasses.push(cssModule.colFlex)
}
columnClasses.push(cssModule.colCreateTime)
columnClasses.push(cssModule.colLastVisitTime)

/**
 * 数据层 pageIdx Map：panelId → pageIdx（坦克履带）。
 *
 * reactive Map 而非 ref<Map>：让 Vue 3 的响应式系统精确追踪每个 key 的 get/set。
 * 子组件用 props.pageIdxMap.get(panelId) 读取时，只追踪该 key——其他 key 的 set
 * 不触发该子组件的 computed 重算。这是「坦克履带精准响应式」的根基——
 * 数据层 vxe-grid 重渲染昂贵（calcCellHeight reflow 几十毫秒），值得用复杂算法换性能。
 *
 * 由 updateTreadMap 函数手动 diff 更新（每次滚动最多 1 个 entry 变化）。
 *
 * 骨架层不再使用 reactive Map——改用整体平移的 computed 数组（见 skeletonPageIdxs）。
 * 骨架面板重渲染极廉价（compositor-only transform + text），不需要坦克履带精准响应式。
 */
const dataPageIdxMap = reactive(new Map<number, number>())

/**
 * 数据版本号：rowCache/cachedPageSet/pageDataMemo 都是非响应式容器（性能优化，
 * 避免深度追踪 1000 行 × N 列），它们的变更不会触发 computed 重算。
 * 每次数据加载完成、CRUD 清缓存时显式 bump，让数据层 buildPageData 重算有触发点。
 */
const dataVersion = ref(0)

/**
 * DataPanel 实例数组：Vue 3 在 v-for 上用 `ref="dataPanelRefs"` 自动填充数组。
 * - 数组顺序与 dataPanels computed 的渲染顺序一致（panelId 升序）
 * - 通过 dataPanelRefs.value[panelId] 取对应实例，O(1) 索引访问
 *
 * 与旧的 Map<number, DataPanelInstance> + 函数 ref 模式相比：
 * - 不再需要"挂载收集/卸载移除"的命令式代码（Vue 自动管理生命周期）
 * - 不再缓存实例引用，每次访问都读最新值（避免实例失效）
 * - DataPanel 内部封装了 CRUD 语义方法（insert/save/cancel/delete），父级不直接摸 grid
 */
const dataPanelRefs = ref<InstanceType<typeof DataPanel>[]>([])

// ==================== memoize（避免 :data 频繁变化触发 vxe-grid 全量重渲染）====================

const pageDataMemo = new Map<number, MeetHr[]>()
const EMPTY_ROWS: MeetHr[] = []

// ==================== 派生 ====================

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))
const pageBlockHeight = computed(() => DIVIDER_HEIGHT + HEADER_HEIGHT + pageSize.value * ROW_HEIGHT)
const spacerHeight = computed(() => totalPages.value * pageBlockHeight.value)
/** 骨架层的可见页号：基于实时 scrollTop 派生，闪电响应 */
const firstVisiblePageIdx = computed(() => Math.floor(scrollTop.value / pageBlockHeight.value))
/** 数据层的可见页号：基于节流版 dataScrollTop 派生，跟随 dataScrollTop 的更新节奏 */
const dataFirstVisiblePageIdx = computed(() => Math.floor(dataScrollTop.value / pageBlockHeight.value))

/**
 * 骨架层每个面板显示的页号数组：按「整体平移」生成，索引即 panelId。
 *
 * 公式：skeletonPageIdxs[panelId] = firstVisiblePageIdx - treadBuffer + panelId
 * - treadBuffer（视口上方预备页数）让 firstVisiblePageIdx 处于面板数组「中间偏前」
 * - panelId 升序对应 pageIdx 升序，物理上从上到下排列
 *
 * 为什么骨架层用整体平移而非数据层的坦克履带？
 * - 骨架面板只是「分割条文字 + shimmer 占位行」，重渲染 = compositor-only transform +
 *   text node 改动，sub-ms 开销；panelCount 个面板同时 ±1 全部重渲染也无感
 * - 数据层（vxe-grid）重渲染才贵（calcCellHeight reflow 几十毫秒），才需要坦克履带
 *   用数论取模让每次滚动只 1 个面板的 pageIdx 真变，其余面板完全无感
 * - 给骨架层也上坦克履带是过度设计——一个 computed 数组够用且代码直观
 *
 * treadBuffer/panelCount 是 computed（在下方声明），computed 求值是惰性的，
 * 此处前向引用在首次 .value 访问时已就绪。
 */
const skeletonPageIdxs = computed<number[]>(() => {
  const fv = firstVisiblePageIdx.value
  const buf = treadBuffer.value
  const pc = panelCount.value
  const arr: number[] = []
  for (let i = 0; i < pc; i++) arr.push(fv - buf + i)
  return arr
})
const currentVisiblePage = computed(() =>
  totalPages.value === 0 ? 0 : clamp(firstVisiblePageIdx.value + 1, 1, totalPages.value)
)

/**
 * 面板数量：treadBuffer × 3（视口 + 上下各 1 倍预备页数）。
 *
 * 设计缘由（与 treadBuffer 共用"视口行数"基准）：
 * - pageSize 小时（如 5 行/页），treadBuffer 自动放大 → panelCount 跟着放大，
 *   保证骨架层覆盖的总行数 ≥ 3 倍视口行数，滚动跨屏时不会瞬间甩出缓存范围
 * - DOM 数量与 pageSize 大致成反比但绝对值可控：pageSize=5 panelCount=9 时
 *   骨架层 ≈ 9 面板 × 6 行 × 9 列 ≈ 500 cell，远低于 pageSize=50 panelCount=3 的 1377 cell
 * - 旧公式 ceil(clientHeight / pageBlockHeight) × 3 在 pageSize 小时给出过小值
 *   （pageSize=5 时仅 6 个面板 = 30 行覆盖，稍滚就 OUT_OF_RANGE）
 *
 * treadBuffer 在下方声明，computed 求值惰性，前向引用在首次 .value 访问时已就绪。
 */
const panelCount = computed(() => treadBuffer.value * 3)

/**
 * LRU 缓存上限：动态随 panelCount 调整，保证 DOM 覆盖的页永远在缓存内。
 *
 * 设计缘由（从固定 10 页改为动态）：
 * - panelCount 随 pageSize 反比例变化（pageSize=5 panelCount=9, pageSize=50 panelCount=3）
 * - 固定 10 页对 pageSize=5 严重不够：DOM 覆盖 [firstVisible-buffer, firstVisible-buffer+panelCount-1]
 *   占 9 页，PRELOAD_RANGE 预取的远端页立即被 LRU 驱逐——用户滚动一页就触发 OUT_OF_RANGE
 * - 公式 max(panelCount × 2, 10)：
 *   ~ panelCount × 2 让缓存能容纳「当前 DOM 范围 + 双向预取范围 + 滞后缓冲」，
 *     滚动时旧预取不会立即被驱逐，避免「fetch-evict-fetch」的浪费
 *   ~ 最小 10 兜底，保证 pageSize 大（panelCount 小）时仍有基本缓存容量
 *
 * 实测数据（pageSize=5, panelCount=9）：缓存上限 = max(18, 10) = 18 页
 *   = 18 × 5 行 × 9 列 ≈ 810 cell，~50KB，内存可忽略
 */
const maxCachedPages = computed(() => Math.max(panelCount.value * 2, 10))

const pageSizeOptions = [
  { label: '5 条/页', value: 5 },
  { label: '20 条/页', value: 20 },
  { label: '50 条/页', value: 50 },
  { label: '100 条/页', value: 100 },
]

// ==================== vxe-grid 配置 ====================

const gridOptions: VxeGridProps<MeetHr> = {
  keepSource: true, // revertData 撤销编辑需要
  border: true,
  stripe: true,
  // 必须禁用虚拟滚动：vxe-grid 默认 gt=60，pageSize=100 时会启用 transform 模式，
  // body-wrapper overflow:hidden + transform 移动 table，与外部 scroll-shell 滚动冲突。
  // 每页 ≤ 100 行全量渲染，禁用虚拟滚动让滚动行为单一来源（scroll-shell）。
  virtualYConfig: { enabled: false, gt: 99999 },
  editConfig: { trigger: 'dblclick', mode: 'row', showStatus: true },
  rowConfig: { keyField: 'id', isHover: true },
  columnConfig: { resizable: true },
  toolbarConfig: { enabled: false },
  // 不传 seqConfig.startIndex：每页内部行号从 1 开始，用户看「第 X 页」分割条知道页号
  columns: buildMeetHrColumns(),
}

// ==================== 坦克履带 pageIdx 计算 ====================

/**
 * 坦克履带算法：给定 firstVisible / buffer / panelCount，计算每个 panelId 的 pageIdx。
 *
 * 核心数学（数论取模代表元）：
 * 每个 panelId 有固定 anchor（= panelId 自身），它的 pageIdx 必须满足：
 *   pageIdx ≡ anchor (mod panelCount)
 * 且落在窗口 [firstVisible - buffer, firstVisible - buffer + panelCount) 内。
 * 这是数论中"取模代表元"问题——给定 anchor 和 panelCount，找出窗口内唯一满足
 * pageIdx ≡ anchor (mod panelCount) 的整数：
 *   pageIdx_k = anchor_k + ceil((lowerBound - anchor_k) / panelCount) × panelCount
 *
 * 关键性质（坦克履带的精髓）：
 * - 每次 firstVisible ±1，最多只有 1 个 panelId 的 pageIdx 变化（±panelCount）
 * - 其他 panelId 的 pageIdx 保持不变 → translateY 不变 → 该子组件完全无感
 * - 用户看到的"滚动"由 scroll-shell.scrollTop 体现，不是 panelId 自己的 transform 变化
 *
 * 这才是真正的「DOM 元素平移魔法」——而非"整体平移 pageIdx 让所有 panelId 重新设置 data"。
 *
 * @param firstVisible 当前视口顶可见的页号（0-based）
 * @param buffer 视口上方的预备页数（panelCount 的 1/3 左右，1 倍视口宽）
 * @param panelCount 面板总数
 * @returns 索引即 panelId 的 pageIdx 数组（可能有越界值，由 buildPageData 返回 EMPTY_ROWS 兜底）
 */
function buildTreadPageIdxs(firstVisible: number, buffer: number, panelCount: number): number[] {
  if (panelCount === 0) return []
  const lowerBound = firstVisible - buffer
  const arr: number[] = []
  for (let panelId = 0; panelId < panelCount; panelId++) {
    const anchor = panelId
    // 数论取模代表元：找最小的 k 使 anchor + k×panelCount ≥ lowerBound，
    // 即 k = ceil((lowerBound - anchor) / panelCount)。
    //
    // 用 Math.ceil 直接算——JS 内置 ceil 对正负参数都正确：
    // - ceil(-1/3) = 0（不能用 Math.floor(-1/3)=-1，那会让 lowerBound=-1 时所有 panelId
    //   都退到 -3/-2/-1 越界，首屏看不到第 0 页）
    // - ceil(1/3) = 1（firstVisible 推进时正确换页）
    const k = Math.ceil((lowerBound - anchor) / panelCount)
    arr.push(anchor + k * panelCount)
  }
  return arr
}

/**
 * 视口缓冲页数：1 倍视口行数对应的页数（视口上方预备）。
 *
 * 设计缘由（按视口行数算，而非按 pageBlockHeight 算）：
 * - 旧公式 ceil(clientHeight / pageBlockHeight) 在 pageSize 小时给出过小值：
 *   pageSize=5 时 pageBlockHeight 仅 328px，clientHeight=600 时算出 buffer=2，
 *   上下预备只覆盖 10 行，滚动稍快就跨出缓存范围 → 频繁 OUT_OF_RANGE
 * - 改用「视口行数 / pageSize」算 buffer，让上下预备始终覆盖至少 1 屏行数：
 *   pageSize=5 时 buffer=3（覆盖 15 行），pageSize=50 时 buffer=1（覆盖 50 行）
 * - 用户感受：pageSize 小时增加 DOM 数量（panelCount 跟着放大）换取缓存命中率，
 *   避免滚动一屏就触发超速；pageSize 大时维持旧值的紧凑布局
 *
 * visibleRows 没算 divider/header overhead（pageBlockHeight 比 pageSize × ROW_HEIGHT
 * 大 ~88px）：作为预备缓冲，多估一点点反而更激进地预取，无可厚非。
 */
const treadBuffer = computed(() => {
  const ch = Math.max(clientHeight.value, 1)
  const visibleRows = Math.max(1, Math.ceil(ch / ROW_HEIGHT))
  return Math.max(1, Math.ceil(visibleRows / pageSize.value))
})

/**
 * 用坦克履带算法 + diff 更新 reactive Map。
 *
 * 设计缘由：避免「整体平移 pageIdx 让所有 panelId 重设 data」。
 * - 算出 newIdxs[panelId] 数组
 * - 跟当前 Map 对比：只 set 变化的 entry（其他 entry 保持引用稳定）
 * - 删除超出 panelCount 范围的多余 entry（panelCount 变小时）
 *
 * 每次 firstVisible ±1 时，最多只有 1 个 entry 变化 → 只 1 个子组件 re-render。
 * 跳页（firstVisible 大幅跳跃）时多个 entry 同时变，diff 一次性更新。
 */
function updateTreadMap(map: Map<number, number>, firstVisible: number, buffer: number, pc: number): void {
  if (pc === 0) {
    // panelCount=0 兜底：清空所有 entry
    for (const k of Array.from(map.keys())) map.delete(k)
    return
  }
  const newIdxs = buildTreadPageIdxs(firstVisible, buffer, pc)
  // 更新/添加 [0, pc) 范围内的 entry
  for (let i = 0; i < pc; i++) {
    const newIdx = newIdxs[i]!
    if (map.get(i) !== newIdx) {
      map.set(i, newIdx)
    }
  }
  // 清理 [pc, ∞) 范围内的多余 entry（panelCount 减少时）
  for (const k of Array.from(map.keys())) {
    if (k >= pc) map.delete(k)
  }
}

// 数据层 Map 更新：监听节流派生的 dataFirstVisiblePageIdx + 同样的 buffer/panelCount
// flush: 'sync'：dataScrollTop.value = ... 同步赋值后立即让 dataPageIdxMap 跟上，
// 行为可预测（未来若在 refreshDataLayer 内同步读 dataPageIdxMap 不必再考虑 flush）。
//
// 骨架层不需要 watch——它用 skeletonPageIdxs computed 数组（整体平移），
// Vue 3 computed 求值是同步懒加载，scrollMode.value 读取时自然拿到当前帧的最新值。
watch(
  () => [dataFirstVisiblePageIdx.value, treadBuffer.value, panelCount.value] as const,
  ([fv, buf, pc]) => updateTreadMap(dataPageIdxMap, fv, buf, pc),
  { immediate: true, deep: false, flush: 'sync' }
)

// ==================== 数据构造（memoize）====================

/**
 * 构造某页的行数组：行齐全返回数组，缺行返回 EMPTY_ROWS。
 *
 * memoize 关键：vxe-grid 看到 :data 引用变化会重跑 calcCellHeight / calcScrollbar（强制 reflow）。
 * 用浅比较命中旧引用可让 vxe-grid 直接跳过整页重渲染。
 *
 * rowCache 里的行对象引用稳定（mockGetMeetHrPage 返回同源对象），浅比较是 O(1) per row。
 */
function buildPageData(pageIdx: number): MeetHr[] {
  const tp = totalPages.value
  if (pageIdx < 0 || pageIdx >= tp) return EMPTY_ROWS

  const ps = pageSize.value
  const start = pageIdx * ps
  const end = Math.min(start + ps, total.value)

  const rows: MeetHr[] = []
  for (let i = start; i < end; i++) {
    const row = rowCache.get(i)
    // 缺行用 EMPTY_ROWS 兜底（让面板显示空，但 grid 实例不卸载）
    if (row === void 0) return EMPTY_ROWS
    rows.push(row)
  }

  const memoized = pageDataMemo.get(pageIdx)
  if (
    memoized !== void 0 &&
    memoized.length === rows.length &&
    memoized.every((row, i) => row === rows[i])
  ) {
    return memoized
  }

  pageDataMemo.set(pageIdx, rows)
  return rows
}

// ==================== 滚动模式判定 ====================

/**
 * 滚动模式：判断当前实时位置是否在缓存内。
 * - IN_RANGE：所有可见页都在 cachedPageSet，数据层可立即跟（无加载等待）
 * - OUT_OF_RANGE：有可见页未缓存，数据层节流，等 ensurePagesLoaded 追上
 *
 * 设计缘由（用缓存覆盖范围而非速度判定，更准确反映「数据是否就绪」）：
 * - 速度判定有误判：用户快速滚回时数据已在缓存，速度虽快但应判 IN_RANGE 让数据层即时跟
 * - 缓存覆盖判定精确：只要数据在缓存，无论滚动多快都应即时响应
 *
 * 为什么是 computed 而非函数：
 * - onScroll 里高频读（≤60Hz），computed 缓存让依赖未变时 O(1) 命中，函数每次都得跑循环
 * - 模板里直接用 scrollMode.value，无需包装；返回值未变（一直 IN_RANGE）时不触发下游重渲染
 * - 响应式追踪 cachedPageSet：通过显式读取 dataVersion，让数据加载/驱逐后（都伴随 bump）
 *   能触发重算（cachedPageSet 是非响应式 Set，自身变化 computed 不会知道）
 *
 * 依赖链：
 * - skeletonPageIdxs（基于实时 scrollTop，onScroll 16ms 节流）→ 反映「用户当前实际位置」
 * - totalPages（基于 total/pageSize）
 * - dataVersion（cachedPageSet 变化的显式触发点）
 *
 * 数组迭代追踪：computed 读 skeletonPageIdxs.value 时 Vue 追踪整个数组（length + 索引），
 * 数组重新生成（firstVisible ±1）会触发本 computed 重算。开销很小（≤panelCount 次 Set.has）。
 */
const scrollMode = computed<ScrollMode>(() => {
  void dataVersion.value
  const tp = totalPages.value
  for (const idx of skeletonPageIdxs.value) {
    // 只检查 [0, totalPages) 范围内的页（越界页是 EMPTY_ROWS，不影响模式）
    if (idx >= 0 && idx < tp && !cachedPageSet.has(idx)) {
      return ScrollMode.OUT_OF_RANGE
    }
  }
  return ScrollMode.IN_RANGE
})

// ==================== OUT_OF_RANGE 节流刷新 ====================

let outOfRangeTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 调度节流刷新：300ms 后让数据层追一次。
 * 已调度时不重复——连续滚动期间至少每 300ms 追一次，不无限推迟。
 */
function scheduleOutOfRangeRefresh(): void {
  if (outOfRangeTimer !== null) return
  outOfRangeTimer = setTimeout(() => {
    outOfRangeTimer = null
    refreshDataLayer()
  }, OUT_OF_RANGE_REFRESH_INTERVAL_MS)
}

/**
 * 让数据层追到当前位置 + 加载新可见页 + 预取下方页。
 *
 * 调用时机：
 * - onScroll IN_RANGE 分支：立即调（用户期望无缝，dataScrollTop 同 tick 跟上）
 * - scheduleOutOfRangeRefresh 的 300ms 定时器：节流追一次（OUT_OF_RANGE 期间）
 * - setScrollTop（跳页/翻页）：立即调，零延迟启动数据加载
 *
 * dataScrollTop 赋值后，dataFirstVisiblePageIdx → dataPageIdxs → dataPanels 链式重算，
 * 数据层视觉上「跳」到新位置。
 *
 * 原子性约束（关键）：只在 scrollMode === IN_RANGE 时才让 dataScrollTop 跟上 scrollTop。
 * - IN_RANGE：新位置所有可见页都已缓存，buildPageData 能立刻返回真实数据，
 *   dataScrollTop 同 tick 跟上是安全的——用户看到「无缝跳过去」。
 * - OUT_OF_RANGE：新位置有未缓存页，buildPageData 会返回 EMPTY_ROWS。此时若让
 *   dataScrollTop 跟上，数据层会跳到新位置但显示空 grid——而它本来覆盖在骨架层
 *   （z-index 1）之上（z-index 2，不透明白底），就把骨架层的 shimmer 给遮住了，
 *   用户看到的是「空表格」而非「骨架占位」，视觉上像 bug。
 *   保留 dataScrollTop 不动 = 数据层冻结在旧位置（通常已滚出视口），骨架层
 *   在新位置正常显示 shimmer，等 ensurePagesLoaded 完成后由那边的 catch-up 追上。
 */
function refreshDataLayer(): void {
  if (scrollMode.value === ScrollMode.IN_RANGE) {
    dataScrollTop.value = scrollTop.value
  }
  const idxs = skeletonPageIdxs.value
  void ensurePagesLoaded(idxs)
  preloadAdjacent(idxs)
}

/**
 * 双向预取 PRELOAD_RANGE 页：让用户滚到上下方时数据提前就位，避免刚出 DOM 范围就 OUT_OF_RANGE。
 *
 * 设计缘由（从仅向前预取改为双向）：
 * - 仅向前预取时，用户跳页后向下滚正常，但向上滚一页就 OUT_OF_RANGE（上方页未缓存）
 * - 双向预取让上下方都有 PRELOAD_RANGE 页「备用」，配合动态 maxCachedPages
 *   让缓存能容纳完整 DOM 范围 + 双向预取，不再发生「刚滚一页就驱逐」的浪费
 * - 任何模式下都可调——预取是异步的、不影响当前视觉
 */
function preloadAdjacent(idxs: readonly number[]): void {
  if (idxs.length === 0) return
  const firstIdx = idxs[0]
  const lastIdx = idxs[idxs.length - 1]
  if (firstIdx === void 0 || lastIdx === void 0) return
  const preload: number[] = []
  // 上方预取（向后滚动用）
  for (let i = 1; i <= PRELOAD_RANGE; i++) {
    const idx = firstIdx - i
    if (idx >= 0) preload.push(idx)
  }
  // 下方预取（向前滚动用）
  for (let i = 1; i <= PRELOAD_RANGE; i++) {
    const idx = lastIdx + i
    if (idx < totalPages.value) preload.push(idx)
  }
  if (preload.length > 0) void ensurePagesLoaded(preload)
}

// ==================== 滚动 handler ====================

/**
 * 滚动事件处理：骨架层零延迟响应 + 数据层按节奏加载。
 *
 * 设计缘由（不用 useThrottleFn 节流，与早期版本的关键差异）：
 * - 早期版本用 useThrottleFn(onScroll, 16) 把整个 handler 节流到 60Hz。
 *   问题是：骨架层追踪（读 DOM scrollTop + 赋 ref）也被一起节流——快速滚动时
 *   骨架 panel 位置滞后视口 1~2 帧，"真空"出现在前缘（panel 还没追到的地方）。
 * - 拆分关注点：骨架层追踪是 sub-ms 操作，不该被节流；数据层昂贵操作本身就有去重守卫。
 *   · ensurePagesLoaded 用 loadingPages Set 去重并发请求
 *   · scheduleOutOfRangeRefresh 用 timer 去重 300ms 节流
 *   · refreshDataLayer 内 dataScrollTop 赋值对相同值是 no-op（Vue ref 不触发响应式）
 * - 现代浏览器 scroll 事件频率 ≤ 显示器刷新率（60~120Hz），onScroll 本身又轻量，
 *   不外层节流也不会过载——骨架层"零延迟"给用户最丝滑的滚动反馈。
 *
 * 验证：关闭"显示数据层"开关后快速滚动，骨架层始终覆盖视口无"真空"。
 */
function onScroll(e: Event): void {
  // 编辑中锁滚动：editingPageIdx !== null 表示有 grid 在编辑或有未保存变更
  if (editingPageIdx.value !== null) return

  scrollTop.value = (e.target as HTMLElement).scrollTop
  // 骨架层 computed 自动跟踪 scrollTop（闪电响应），无需手动调

  // 数据层根据 mode 决定何时让 dataScrollTop 跟上 scrollTop：
  // - IN_RANGE：立即 refreshDataLayer，dataScrollTop 同 tick 跟上，数据层无缝滚动
  // - OUT_OF_RANGE：scheduleOutOfRangeRefresh 节流，300ms 后让 dataScrollTop 跟一次
  //   期间骨架层已追到新位置显示 shimmer，数据层稳定停在旧位置兜底
  if (scrollMode.value === ScrollMode.IN_RANGE) {
    refreshDataLayer()
  } else {
    scheduleOutOfRangeRefresh()
  }
}

// ==================== 懒加载 ====================

/**
 * 确保给定页号列表的行都已进 rowCache，缺页并发拉取。
 *
 * 与 InfinitePagesImpl 的差异：
 * - 用 cachedPageSet.has(idx) 判定是否已缓存（O(1)），而非 isPageComplete 逐行查
 * - cachedPageSet 在拉取完成后 add(idx)，下次 ensurePagesLoaded 直接命中
 * - rowCache 用 Map（非 reactive），不触发响应式追踪
 * - 拉取完成后 bump dataVersion，让 dataPanels computed 重算显示新加载的页
 * （rowCache 是非响应式容器，自身 add/delete 不触发依赖它的 computed，必须显式 bump）
 */
async function ensurePagesLoaded(indices: readonly number[]): Promise<void> {
  const tp = totalPages.value
  const needLoad = indices.filter(
    (idx) => idx >= 0 && idx < tp && !cachedPageSet.has(idx) && !loadingPages.has(idx)
  )
  if (needLoad.length === 0) return

  needLoad.forEach((idx) => loadingPages.add(idx))

  try {
    const settled = await Promise.allSettled(
      needLoad.map((idx) => mockGetMeetHrPage(idx + 1, pageSize.value))
    )
    const ps = pageSize.value
    settled.forEach((res, i) => {
      const idx = needLoad[i]
      if (idx === void 0) return
      if (res.status === 'fulfilled') {
        const start = idx * ps
        res.value.data.forEach((row, j) => rowCache.set(start + j, row))
        cachedPageSet.add(idx)
      }
      // rejected：cachedPageSet 不 add，下次 ensurePagesLoaded 重试
    })

    // LRU 驱逐：缓存页数超限时，驱逐距离视口最远的页
    evictDistantPages()

    // 数据加载完成：bump dataVersion 让 dataPanels computed 重算。
    // rowCache/cachedPageSet/pageDataMemo 都是非响应式容器，自身变更不触发依赖追踪，
    // 必须显式 bump version 才能让 dataPanels 知道"数据变了"需要重建 panel.data
    dataVersion.value++

    // 原子切换的 catch-up：跳页到超出缓存时，refreshDataLayer 因 scrollMode=OUT_OF_RANGE
    // 没让 dataScrollTop 跟上 scrollTop，数据层冻结在旧位置（已滚出视口）。
    // 此时数据加载完成 + cachedPageSet.add → scrollMode 转 IN_RANGE（computed 同步重算），
    // 显式让 dataScrollTop 追上 scrollTop，数据层立刻跳到新位置显示刚加载的数据。
    // 顺序关键：必须在 dataVersion++ 之后读 scrollMode.value，才能拿到反映新缓存的判定。
    if (scrollMode.value === ScrollMode.IN_RANGE && dataScrollTop.value !== scrollTop.value) {
      dataScrollTop.value = scrollTop.value
    }
  } finally {
    needLoad.forEach((idx) => loadingPages.delete(idx))
  }
}

/**
 * LRU 驱逐：当 cachedPageSet.size > MAX_CACHED_PAGES 时，驱逐距离 firstVisiblePageIdx 最远的页。
 *
 * 设计缘由：无限数据场景下内存有限，必须舍弃「离用户最远」的老数据。
 * 「最远」按 |pageIdx - firstVisiblePageIdx| 度量，简单的距离度量足够实用。
 *
 * 驱逐时同步删除：
 * - cachedPageSet 中的页号
 * - rowCache 中该页对应的所有行（pageSize 行）
 * - pageDataMemo 中的 memo（避免数据已被驱逐但 memo 仍指向旧数组）
 */
function evictDistantPages(): void {
  if (cachedPageSet.size <= maxCachedPages.value) return

  // 计算每个缓存页距视口的距离，远的在前
  const distances = Array.from(cachedPageSet).map((idx) => ({
    idx,
    distance: Math.abs(idx - firstVisiblePageIdx.value),
  }))
  distances.sort((a, b) => b.distance - a.distance)

  const evictCount = cachedPageSet.size - maxCachedPages.value
  const ps = pageSize.value
  for (let i = 0; i < evictCount; i++) {
    const item = distances[i]
    if (item === void 0) continue
    const { idx } = item
    cachedPageSet.delete(idx)
    // 删除该页对应的所有行
    const start = idx * ps
    const end = start + ps
    for (let r = start; r < end; r++) {
      rowCache.delete(r)
    }
    // 清掉 memo（旧数组引用失效，避免下次命中已驱逐的数据）
    pageDataMemo.delete(idx)
  }
}

// ==================== 跳页 ====================

/**
 * 程序化设置滚动位置：同步 DOM + Vue ref，并立即触发数据层加载。
 *
 * 设计缘由（不能只靠原生 scroll 事件）：
 * - 实测发现本 Chrome 环境下，JS 设置 element.scrollTop 不会触发原生 scroll 事件
 *   （addEventListener 注册的 listener 都收不到），导致依赖 scroll 事件的 onScroll
 *   不跑，骨架层/数据层/scrollMode 都基于陈旧 scrollTop 计算——用户看到的 panel 位置
 *   和实际 DOM 位置差好几个 pageBlockHeight
 * - 跳页/翻页是用户明确的「换位置」语义，不属于「快速滚动」节流范畴
 * - 立即同步 scrollTop.value + 立即调 refreshDataLayer 让数据层零延迟开始拉取，
 *   不等 300ms 节流定时器——后续若原生 scroll 事件到达，onScroll 内的赋值是 no-op
 */
function setScrollTop(newScrollTop: number): void {
  if (scrollShellEl.value) {
    scrollShellEl.value.scrollTop = newScrollTop
  }
  scrollTop.value = newScrollTop
  refreshDataLayer()
}

function jumpToPage(): void {
  if (editingPageIdx.value !== null) return
  const target = clamp(jumpTarget.value, 1, Math.max(totalPages.value, 1))
  jumpTarget.value = target
  setScrollTop((target - 1) * pageBlockHeight.value)
}

function prevPage(): void {
  if (editingPageIdx.value !== null) return
  if (currentVisiblePage.value <= 1) return
  jumpTarget.value = currentVisiblePage.value - 1
  setScrollTop((jumpTarget.value - 1) * pageBlockHeight.value)
}

function nextPage(): void {
  if (editingPageIdx.value !== null) return
  if (currentVisiblePage.value >= totalPages.value) return
  jumpTarget.value = currentVisiblePage.value + 1
  setScrollTop((jumpTarget.value - 1) * pageBlockHeight.value)
}

// ==================== CRUD ====================

/**
 * 通过 pageIdx 找到对应的 DataPanel 实例。
 * 遍历 dataPageIdxMap 找出 pageIdx 对应的 panelId，再从 dataPanelRefs 索引取出。
 * 编辑/插入等场景按 pageIdx 路由，需要这个反查。
 */
function getPanelByPageIdx(pageIdx: number): InstanceType<typeof DataPanel> | undefined {
  for (const [pid, idx] of dataPageIdxMap.entries()) {
    if (idx === pageIdx) return dataPanelRefs.value[pid]
  }
  return void 0
}

/**
 * 新增：默认插入到 firstVisiblePageIdx（用户当前看的页）。
 * 已在编辑某页时连续插入到同一页（保留编辑上下文）。
 */
async function handleInsert(): Promise<void> {
  if (total.value === 0) return
  const idx = editingPageIdx.value ?? firstVisiblePageIdx.value
  const panel = getPanelByPageIdx(idx)
  if (!panel) return
  editingPageIdx.value = idx
  await panel.insert(createEmptyMeetHr())
}

function onEditActived(pageIdx: number): void {
  editingPageIdx.value = pageIdx
  isEditing.value = true
}

function onEditClosed(): void {
  isEditing.value = false
  // 不清 editingPageIdx：用户可能继续编辑别的 cell，或准备点保存/取消。
  // editingPageIdx 只在 handleSave/handleDelete/handleCancel 时清空
}

/**
 * 保存：遍历所有数据面板收集 insertRecords/updateRecords，调对应 API。
 * 理论上只有 editingPageIdx 的面板有变更，但全遍历更保险。
 *
 * 流程：每面板先读 pending changes 收集 API 任务，再 clearEdit 关闭编辑态。
 */
async function handleSave(): Promise<void> {
  const tasks: Promise<unknown>[] = []
  for (const panel of dataPanelRefs.value) {
    if (!panel) continue
    const { insertRecords, updateRecords } = panel.getPendingChanges()
    for (const record of insertRecords) {
      // 新增记录的 id 是前端临时负数（createEmptyMeetHr 用 -Date.now() - seed），交给后端分配
      record.id = void 0
      tasks.push(mockAddMeetHr(record))
    }
    for (const record of updateRecords) {
      if (record.id) tasks.push(mockUpdateMeetHr(record.id, record))
    }
    await panel.clearEdit()
  }
  if (tasks.length > 0) await Promise.all(tasks)
  await onAfterMutation()
}

/** 删除：遍历所有数据面板收集 checkbox 选中的行，调 delete API */
async function handleDelete(): Promise<void> {
  const tasks: Promise<unknown>[] = []
  for (const panel of dataPanelRefs.value) {
    if (!panel) continue
    for (const record of panel.getSelectedRecords()) {
      // 临时负 id（前端未保存的新增行）跳过
      if (record.id && record.id > 0) {
        tasks.push(mockDeleteMeetHr(record.id))
      }
    }
  }
  if (tasks.length > 0) await Promise.all(tasks)
  await onAfterMutation()
}

/**
 * 取消编辑：每面板自己处理 clearEdit + revert/remove 语义（详见 DataPanel.cancel）。
 * 父级只负责清空 editingPageIdx/isEditing 状态。
 */
async function handleCancel(): Promise<void> {
  for (const panel of dataPanelRefs.value) {
    if (!panel) continue
    await panel.cancel()
  }
  editingPageIdx.value = null
  isEditing.value = false
}

/**
 * 增删改后回调：清空所有缓存，重新拉 total 和当前可见范围。
 *
 * 设计缘由：CRUD 让数据顺序/内容变化，旧缓存的行都对应错误的页。
 * 全部清空 → cachedPageSet 清空 → scrollMode 必为 OUT_OF_RANGE →
 * 数据层冻结 → 骨架层接管显示 → ensurePagesLoaded 重新拉取 → 数据层刷新
 */
async function onAfterMutation(): Promise<void> {
  rowCache.clear()
  cachedPageSet.clear()
  pageDataMemo.clear()

  total.value = await mockGetMeetHrCount()
  editingPageIdx.value = null
  isEditing.value = false

  // 等 nextTick 让 totalPages / spacerHeight 等派生重算
  await nextTick()

  // 清空缓存已让 cachedPageSet 为空 → scrollMode 必为 OUT_OF_RANGE。
  // 骨架层是 computed，自动跟踪 scrollTop/totalPages 变化无需手动调。
  // 数据层需要：让 dataScrollTop 跟上 scrollTop（数据层也追到当前位置）+
  // bump dataVersion（让 buildPageData 重新读已清空的 rowCache，否则会命中 pageDataMemo
  // 旧 memo 显示陈旧数据）。
  dataScrollTop.value = scrollTop.value
  dataVersion.value++

  // 拉取当前可见范围（成功后内部 bump dataVersion 让数据层显示）
  await ensurePagesLoaded(skeletonPageIdxs.value)
}

// ESC 键取消编辑：编辑态按 Esc 触发 handleCancel
useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape' && editingPageIdx.value !== null) {
    void handleCancel()
  }
})

// ==================== 客户端尺寸监听 ====================

useResizeObserver(scrollShellEl, (entries) => {
  const rect = entries[0]?.contentRect
  if (rect) {
    // clientHeight 变化让 panelCount/skeletonPageIdxs/dataPageIdxs 全部 computed 自动重算，
    // 骨架层/数据层会自动跟到新位置——无需任何手动干预
    clientHeight.value = rect.height
  }
})

// ==================== pageSize 变化 ====================

watch(pageSize, (newSize, oldSize) => {
  if (editingPageIdx.value !== null) return

  // pageSize 变化 → cachedPageSet 完全失效（页号重切），但 rowCache 保留（按全局行号）
  // 重新扫描 rowCache 按新 pageSize 计算哪些页"完整缓存"
  recomputeCachedPageSet()
  pageDataMemo.clear()

  // 计算新 scrollTop：保持视口顶端看到的还是原来那行（参考 InfinitePagesImpl 的算法）
  const headerOverhead = DIVIDER_HEIGHT + HEADER_HEIGHT
  const oldPageBlockH = headerOverhead + oldSize * ROW_HEIGHT
  const oldPageIdx = Math.floor(scrollTop.value / oldPageBlockH)
  const oldPageOffset = scrollTop.value - oldPageIdx * oldPageBlockH

  // 特例：视口顶在第 0 页的 overhead 区域（分割条/表头）——两种布局下 spacer 顶端都对齐
  if (oldPageIdx === 0 && oldPageOffset < headerOverhead) {
    void nextTick(() => {
      if (scrollShellEl.value) scrollShellEl.value.scrollTop = scrollTop.value
    })
    return
  }

  const intraRowPixel = oldPageOffset - headerOverhead
  let globalRow: number
  let pixelIntoRow: number
  if (intraRowPixel < 0) {
    globalRow = oldPageIdx * oldSize
    pixelIntoRow = 0
  } else {
    globalRow = oldPageIdx * oldSize + Math.floor(intraRowPixel / ROW_HEIGHT)
    pixelIntoRow = intraRowPixel % ROW_HEIGHT
  }

  if (globalRow >= total.value) {
    globalRow = Math.max(0, total.value - 1)
    pixelIntoRow = 0
  }

  const newPageIdx = Math.floor(globalRow / newSize)
  const newRowInPage = globalRow - newPageIdx * newSize
  const newScrollTop =
    newPageIdx * pageBlockHeight.value + headerOverhead + newRowInPage * ROW_HEIGHT + pixelIntoRow

  scrollTop.value = newScrollTop
  dataScrollTop.value = newScrollTop // 数据层也立即跟到新 pageSize 下的位置
  jumpTarget.value = newPageIdx + 1
  void nextTick(() => {
    if (scrollShellEl.value) scrollShellEl.value.scrollTop = newScrollTop
    // pageBlockHeight 变化让 skeletonPageIdxs/dataPageIdxs computed 重算新 pageIdxs，
    // dataPanels/skeletonPanels 自动跟随。rowCache 已被 recomputeCachedPageSet 重扫但
    // buildPageData 读的是同一 Map，无需 bump dataVersion
  })
})

/**
 * 重新计算 cachedPageSet：按新 pageSize 扫描 rowCache，把"行齐全"的页号加入。
 *
 * 设计缘由：pageSize 变化时页号完全重切，cachedPageSet 失效，但 rowCache 按
 * 全局行号索引仍有效。扫描一次让"恰好拼齐"的页继续命中，避免重复请求。
 *
 * O(total) 扫描，只在 pageSize 变化时执行（用户操作不频繁），可接受。
 */
function recomputeCachedPageSet(): void {
  cachedPageSet.clear()
  const ps = pageSize.value
  const tp = totalPages.value
  const t = total.value
  for (let pageIdx = 0; pageIdx < tp; pageIdx++) {
    const start = pageIdx * ps
    const end = Math.min(start + ps, t)
    let complete = true
    for (let i = start; i < end; i++) {
      if (!rowCache.has(i)) {
        complete = false
        break
      }
    }
    if (complete) cachedPageSet.add(pageIdx)
  }
}

// ==================== 生命周期 ====================

onMounted(async () => {
  total.value = await mockGetMeetHrCount()
  await nextTick()
  // 等 ResizeObserver 第一次回调把 clientHeight 设上
  await nextTick()

  // total/clientHeight 变化让 panelCount/treadBuffer/skeletonPageIdxs 由 computed 自动派生，
  // 进而触发 watch 把 dataPageIdxMap 填好。
  // scrollTop/dataScrollTop 初始都是 0，数据层和骨架层都从第 0 页开始
  await ensurePagesLoaded(skeletonPageIdxs.value)
})

// ==================== 调试接口（挂 window，方便 DevTools 验证）====================

interface InfiniteTransformTrickDebug {
  readonly total: number
  readonly pageSize: number
  readonly totalPages: number
  readonly pageBlockHeight: number
  readonly spacerHeight: number
  readonly scrollTop: number
  /** 数据层节流版滚动位置（IN_RANGE 同步，OUT_OF_RANGE 每 300ms 追一次） */
  readonly dataScrollTop: number
  readonly clientHeight: number
  readonly firstVisiblePageIdx: number
  /** 数据层节流派生的可见页号 */
  readonly dataFirstVisiblePageIdx: number
  readonly panelCount: number
  readonly cachedPageCount: number
  readonly cachedPages: readonly number[]
  readonly loadingPages: readonly number[]
  readonly rowCacheSize: number
  readonly skeletonPanels: ReadonlyArray<{ panelId: number; pageIdx: number }>
  readonly dataPanels: ReadonlyArray<{ panelId: number; pageIdx: number; rowCount: number }>
  readonly scrollMode: ScrollMode
  scrollToPage: (pageIdx1Based: number) => void
}
declare global {
  interface Window {
    __infiniteTransformTrickDebug?: InfiniteTransformTrickDebug
  }
}
if (window !== void 0) {
  window.__infiniteTransformTrickDebug = {
    get total() {
      return total.value
    },
    get pageSize() {
      return pageSize.value
    },
    get totalPages() {
      return totalPages.value
    },
    get pageBlockHeight() {
      return pageBlockHeight.value
    },
    get spacerHeight() {
      return spacerHeight.value
    },
    get scrollTop() {
      return scrollTop.value
    },
    get dataScrollTop() {
      return dataScrollTop.value
    },
    get clientHeight() {
      return clientHeight.value
    },
    get firstVisiblePageIdx() {
      return firstVisiblePageIdx.value
    },
    get dataFirstVisiblePageIdx() {
      return dataFirstVisiblePageIdx.value
    },
    get panelCount() {
      return panelCount.value
    },
    get cachedPageCount() {
      return cachedPageSet.size
    },
    get cachedPages() {
      return Array.from(cachedPageSet).sort((a, b) => a - b)
    },
    get loadingPages() {
      return Array.from(loadingPages)
    },
    get rowCacheSize() {
      return rowCache.size
    },
    get skeletonPanels() {
      return skeletonPageIdxs.value.map((pageIdx, panelId) => ({ panelId, pageIdx }))
    },
    get dataPanels() {
      return Array.from(dataPageIdxMap.entries()).map(([panelId, pageIdx]) => ({
        panelId,
        pageIdx,
        rowCount: buildPageData(pageIdx).length,
      }))
    },
    get scrollMode() {
      return scrollMode.value
    },
    scrollToPage: (pageIdx1Based: number) => {
      setScrollTop((pageIdx1Based - 1) * pageBlockHeight.value)
    },
  }
}
</script>

<template>
  <div :class="$style.root">
    <CrudToolbar @insert="handleInsert" @delete="handleDelete" @save="handleSave">
      <template #cancel>
        <button
          v-if="editingPageIdx !== null"
          type="button"
          :class="$style.btnCancel"
          @click="handleCancel"
        >
          取消
        </button>
      </template>
      <div :class="$style.navGroup">
        <label :class="$style.fieldLabel">
          分页大小
          <NSelect
            v-model:value="pageSize"
            :options="pageSizeOptions"
            size="small"
            :disabled="editingPageIdx !== null"
            :class="$style.pageSizeSelect"
          />
        </label>
        <div :class="$style.pageNav">
          <button
            type="button"
            :class="$style.navBtn"
            :disabled="editingPageIdx !== null || currentVisiblePage <= 1"
            title="上一页"
            @click="prevPage"
          >
            ‹
          </button>
          <span :class="$style.pageBadge">{{ currentVisiblePage }} / {{ totalPages }} 页</span>
          <button
            type="button"
            :class="$style.navBtn"
            :disabled="editingPageIdx !== null || currentVisiblePage >= totalPages"
            title="下一页"
            @click="nextPage"
          >
            ›
          </button>
        </div>
        <label :class="$style.fieldLabel">
          跳转到第
          <NInputNumber
            v-model:value="jumpTarget"
            size="small"
            :min="1"
            :max="Math.max(totalPages, 1)"
            :disabled="editingPageIdx !== null"
            :class="$style.jumpInput"
            @keyup.enter="jumpToPage"
          />
          页
          <button
            type="button"
            :class="$style.jumpBtn"
            :disabled="editingPageIdx !== null"
            @click="jumpToPage"
          >
            Go
          </button>
        </label>
        <label :class="$style.fieldLabel">
          显示数据层
          <NSwitch v-model:value="showDataLayer" size="small" :disabled="editingPageIdx !== null" />
        </label>
      </div>
      <span :class="$style.status">
        共 {{ total }} 条 · 已缓存 {{ cachedPageSet.size }} 页 · 实际DOM表格总数 {{ panelCount }} ·
        scrollTop {{ Math.round(scrollTop) }}px · dataScrollTop {{ Math.round(dataScrollTop) }}px · 页
        {{ currentVisiblePage }}/{{ totalPages }}
        <span
          :class="[
            $style.modeTag,
            scrollMode === ScrollMode.OUT_OF_RANGE ? $style.modeTagOut : $style.modeTagIn,
          ]"
          :title="
            scrollMode === ScrollMode.OUT_OF_RANGE
              ? '可见页有未缓存的，数据层节流（300ms 一次），骨架层先兜底'
              : '所有可见页都已缓存，数据层即时跟踪 scrollTop'
          "
        >
          {{ scrollMode === ScrollMode.OUT_OF_RANGE ? '超速模式' : '跟踪正常' }}
        </span>
        <template v-if="editingPageIdx !== null">
          ·
          <span :class="$style.editingTag">编辑中（第 {{ editingPageIdx + 1 }} 页，Esc 取消）</span>
        </template>
      </span>
    </CrudToolbar>
    <div :class="$style.tableContainer">
      <div
        ref="scrollShellEl"
        :class="[$style.scrollShell, editingPageIdx !== null && $style.scrollLocked]"
        @scroll.passive="onScroll"
      >
        <div :class="$style.spacer">
          <!-- 骨架层（z-index 1）：始终即时响应用户滚动，提供「闪电响应」。
               父组件传整体平移的 pageIdx（firstVisible - buffer + panelId），
               每次滚动所有面板都 ±1 重渲染，但骨架重渲染极廉价（compositor-only transform） -->
          <SkeletonPanel
            v-for="pid in panelIds"
            :key="`s-${pid}`"
            :panel-id="pid"
            :page-idx="skeletonPageIdxs[pid]!"
            :page-block-height="pageBlockHeight"
            :divider-height="DIVIDER_HEIGHT"
            :header-height="HEADER_HEIGHT"
            :row-height="ROW_HEIGHT"
            :page-size="pageSize"
            :column-classes="columnClasses"
          />
          <!-- 数据层（z-index 2）：vxe-grid 实例固定不变。
               子组件读 reactive Map entry + 自己构造 data，每次滚动只 1 个 DataPanel
               （含 vxe-grid）重渲染，其他 DataPanel 完全无感。
               传 buildPageData + dataVersion 让子组件内部 computed 能响应 rowCache 变化 -->
          <!-- Demo 包装层：showDataLayer=false 时 visibility:hidden 隐藏数据层，
               露出底层骨架层（z-index 1）。保留 DOM 不触发 grid 重挂载，切换瞬时无开销 -->
          <div :class="[$style.dataLayerWrapper, !showDataLayer && $style.dataLayerHidden]">
            <DataPanel
              v-for="pid in panelIds"
              :key="`d-${pid}`"
              ref="dataPanelRefs"
              :panel-id="pid"
              :page-idx-map="dataPageIdxMap"
              :page-block-height="pageBlockHeight"
              :divider-height="DIVIDER_HEIGHT"
              :grid-options="gridOptions"
              :build-page-data="buildPageData"
              :data-version="dataVersion"
              @edit-actived="onEditActived"
              @edit-closed="onEditClosed"
            />
          </div>
        </div>
      </div>
      <div v-if="editingPageIdx !== null" :class="$style.scrollLockOverlay">
        <span>编辑中 · 滚动 / 分页 / 跳页已锁定（保存、删除或按 Esc 解锁）</span>
      </div>
    </div>
  </div>
</template>

<style module>
.root {
  padding: 16px;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.fieldLabel {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #555;
}

/* 取消按钮：中性灰，语义弱于"保存/删除"。基础 button 样式从 CrudToolbar 的
 * `.toolbar > button` 继承（直接子按钮），这里只覆盖颜色 */
.btnCancel {
  color: #fff;
  background-color: #909399;
  border-color: #909399;
}

.btnCancel:hover {
  background-color: #a6a9ad;
  border-color: #a6a9ad;
}

.navGroup {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  padding-left: 12px;
  margin-left: 4px;
  border-left: 1px solid #e8e8e8;
}

.pageNav {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* navBtn / jumpBtn 用 `.pageNav .navBtn` / `.fieldLabel .jumpBtn` 提高特异性 (0,2,0)，
 * 覆盖 CrudToolbar 的 `.toolbar button` (0,1,1)——后者虽源码是 `.toolbar > button`，
 * 但 Vite+ 的 CSS 编译把 `>` 剥成后代选择器，会污染到 navGroup 内的按钮 */
.pageNav .navBtn {
  width: 26px;
  height: 26px;
  padding: 0;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  background-color: #fff;
  color: #555;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pageNav .navBtn:hover:not(:disabled) {
  border-color: #409eff;
  color: #409eff;
}

.pageNav .navBtn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.pageBadge {
  padding: 4px 12px;
  border-radius: 4px;
  background-color: #409eff;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 1px;
  user-select: none;
}

.pageSizeSelect {
  width: 110px;
}

.jumpInput {
  width: 90px;
}

.fieldLabel .jumpBtn {
  padding: 4px 14px;
  border-radius: 4px;
  border: 1px solid #409eff;
  background-color: #409eff;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
}

.fieldLabel .jumpBtn:hover:not(:disabled) {
  background-color: #66b1ff;
  border-color: #66b1ff;
}

.fieldLabel .jumpBtn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.status {
  margin-left: auto;
  font-size: 12px;
  color: #888;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.editingTag {
  color: #b8860b;
  font-weight: 600;
}

/* 滚动模式标签：把 scrollMode 这个抽象状态可视化，让用户/Demo 观众一眼看到
 * 「现在是不是超速」。颜色用语义色——蓝色 = 正常跟踪，橙色 = 超速节流 */
.modeTag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-left: 4px;
  user-select: none;
}

.modeTagIn {
  background-color: #e6f4ff;
  color: #1890ff;
  border: 1px solid #91caff;
}

.modeTagOut {
  background-color: #fff7e6;
  color: #d46b08;
  border: 1px solid #ffd591;
  /* 超速模式用轻微脉冲提醒用户：数据层正在节流追赶 */
  animation: modeTagPulse 1.4s ease-in-out infinite;
}

@keyframes modeTagPulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(212, 107, 8, 0.35);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(212, 107, 8, 0);
  }
}

.tableContainer {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
}

.scrollShell {
  flex: 1;
  min-height: 0;
  overflow: auto;
  position: relative;
  box-sizing: border-box;
  border: 1px solid #e8e8e8;
}

.scrollLocked {
  overflow: hidden !important;
}

.spacer {
  position: relative;
  width: 100%;
  height: calc(v-bind(spacerHeight) * 1px);
  /* overflow:hidden 关键：当 last page 时，骨架层与数据层「整体平移」算法会生成
   * pageIdx ≥ totalPages 的越界面板（例如 totalPages=200，firstVisible=198，panelCount=9，
   * buffer=3，skeletonPageIdxs 范围会延伸到 195..203）。这些越界面板的 translateY
   * 会超过 spacerHeight（例：第 204 页 translateY=203×328=66784，超出 65600）。
   *
   * 没有 overflow:hidden 时，position:absolute 子元素的视觉溢出会让外层 scrollShell
   * 的 scrollHeight 跟着撑大（实测 65600 → 66912，相当于多出 4 页），用户就能继续
   * 往下滚，看到「第 201 页」「第 202 页」等不存在的分割条——与真实分页总数对不上。
   *
   * 加上 overflow:hidden 后，越界面板被裁剪到 spacerHeight 范围内，scrollShell 的
   * scrollHeight 严格等于 spacerHeight，maxScrollTop 也被正确钳制为
   * spacerHeight - clientHeight，用户永远滚不到「第 201 页」。
   *
   * 为什么不在算法层 clamp pageIdx：整体平移算法的精髓就是「panelCount 个面板同时 ±1」，
   * 越界面板是算法的副作用而不是 bug——它们只是被裁剪不可见。在算法层 clamp 反而
   * 破坏平移对称性，且需要给两端分别写不对称逻辑。CSS 层一刀切更简洁。 */
  overflow: hidden;
}

/* 列宽 class：表格布局单一来源，由父组件声明，子组件（SkeletonPanel）通过 prop 消费。
 * v-bind('FIXED_COLUMN_WIDTHS.xxx') 与 buildMeetHrColumns 默认列定义共享同一常量，
 * 保证骨架层列宽与数据层 vxe-grid 列宽像素级对齐——用户从骨架过渡到真实数据时无抖动。
 * 固定宽列：width + flex:0 0 auto；flex 文本列：flex:1 等分剩余宽度（与 vxe-grid 平分算法对齐） */
.colCheckbox {
  width: calc(v-bind('FIXED_COLUMN_WIDTHS.checkbox') * 1px);
  flex: 0 0 auto;
}

.colSeq {
  width: calc(v-bind('FIXED_COLUMN_WIDTHS.seq') * 1px);
  flex: 0 0 auto;
}

.colFlex {
  flex: 1;
}

.colCreateTime {
  width: calc(v-bind('FIXED_COLUMN_WIDTHS.createTime') * 1px);
  flex: 0 0 auto;
}

.colLastVisitTime {
  width: calc(v-bind('FIXED_COLUMN_WIDTHS.lastVisitTime') * 1px);
  flex: 0 0 auto;
}

/* 数据层包装：position:absolute + inset:0 让它精确覆盖 spacer，
 * 不影响内部 DataPanel 的 absolute 定位（子元素 translateY 仍相对 spacer 原点） */
.dataLayerWrapper {
  position: absolute;
  inset: 0;
}

/* Demo 隐藏：visibility:hidden 保留 DOM（vxe-grid 实例不卸载），仅视觉隐藏。
 * 比 display:none 好——display:none 触发 grid 重排，切换时卡顿；
 * 比 opacity:0 好——opacity:0 仍可交互（pointer-events 默认 auto），用户可能误点 */
.dataLayerHidden {
  visibility: hidden;
}

.scrollLockOverlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 200, 0, 0.08);
  pointer-events: none;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding-bottom: 12px;
  font-size: 12px;
  color: #b8860b;
  z-index: 10;
}
</style>

<script setup lang="ts">
/**
 * 数据面板（DataPanel）—— transform trick 架构的「数据层」。
 *
 * 角色（两层架构中的上层，z-index: 2）：
 * - 不透明背景覆盖骨架层，显示真实的分割条 + vxe-grid 数据
 * - IN_RANGE 模式：onScroll 时即时更新（父组件原子切换 pageIdx + transform + data）
 * - OUT_OF_RANGE 模式：完全冻结（父组件不修改 props），由父级每 300ms 节流唤醒一次
 *   重新计算所有面板状态，然后再次冻结
 *
 * 与骨架层的分工（两层都自带分割条，不依赖透明穿透）：
 * - IN_RANGE：数据层与骨架层 pageIdx 同步重合，数据层不透明白底盖住骨架层，
 *   用户看到的是数据层的分割条 + 真实数据。
 * - OUT_OF_RANGE：数据层冻结在旧 pageIdx（旧位置可能已滚出视口），骨架层即时
 *   追踪到新 pageIdx（视口内），用户在新位置看到骨架层的分割条 + shimmer 占位。
 * - 两层各自位于自己的 translateY 位置，永远不会重叠，因此各自渲染分割条不会
 *   产生"双分割条"视觉冲突，也无需透明 hack 让下层穿透。
 *
 * 与 InfinitePagesImpl 的本质差异：
 * - 后者：每个页号一个 grid 实例，跨页时 mount/unmount（vxe-grid 挂载开销 ~秒级）
 * - 本实现：固定 panelCount 个 grid 实例永远活着，只通过 transform 平移 + data 切换
 *
 * 关键性能点：
 * - v-for key=panelId（永不变），避免 grid 卸载重建
 * - :data 引用由父组件 memoize（同内容数组复用引用），避免 vxe-grid 重跑 calcCellHeight
 * - 多一个 40px 分割条 div 的渲染开销远低于 vxe-grid 自身，无需省略
 */

import type { VxeGridInstance, VxeGridProps } from 'vxe-table'

import { computed, ref } from 'vue'

import type { MeetHr } from '@/model/web/api/meet-hr'

interface Props {
  /** 面板固定 ID（用于 v-for key 和 reactive Map 的索引，永不变化） */
  panelId: number
  /**
   * 父组件维护的「panelId → pageIdx」reactive Map（坦克履带模式）。
   *
   * 父组件用数论取模代表元算法 + watch diff 只更新变化的 entry，
   * 子组件自己 computed 读自己 panelId 对应的 entry——Vue 3 reactive Map 的 get
   * 只追踪该 key，其他 key 的 set 不触发本 computed 重算。
   *
   * 这就是「坦克履带」精准响应式的关键：每次滚动只有 1 个 panelId 的 pageIdx 真变化，
   * 对应那一格 DataPanel 才 re-render（包括 vxe-grid 的 :data 重算），其他 DataPanel
   * 完全不受影响——避免了「全表格重新加载数据」的开销。
   */
  pageIdxMap: Map<number, number>
  /** 单页块高度。所有面板共享同一公式 translateY(pageIdx × pageBlockHeight) */
  pageBlockHeight: number
  /** 分割条高度（与骨架层一致，让两层在垂直方向完美对齐） */
  dividerHeight: number
  /** vxe-grid 配置（columns/editConfig 等）。父级 memoize 后传同一引用 */
  gridOptions: VxeGridProps<MeetHr>
  /**
   * 父级数据构造器：按 pageIdx 构造该页行数组（含 memoize + EMPTY_ROWS 兜底）。
   *
   * 设计缘由：把 data 的构造放到子组件内部 computed 里——避免父组件 render effect
   * 追踪所有 panelId 的 Map entry（违背「坦克履带精准响应式」原则）。
   * 父级只传一个稳定的函数引用 + 一个会 bump 的 dataVersion 数字，
   * 子组件自己读自己 panelId 的 pageIdx + 自己调 buildPageData(pageIdx)。
   */
  buildPageData: (pageIdx: number) => MeetHr[]
  /**
   * 数据版本号：父级在 rowCache/cachedPageSet/pageDataMemo 这些**非响应式**容器
   * 变更后显式 bump，作为唯一响应式触发点让本面板的 data computed 重算。
   *
   * 不在 buildPageData 里搞响应式追踪是因为 rowCache 是 Map（1000 行 × N 列），
   * 深度 reactive 会带来沉重开销。dataVersion 一个数字的 patch 成本忽略不计。
   */
  dataVersion: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  /** 用户双击某行进入编辑态，把当前面板的 pageIdx 透传给父级 */
  editActived: [pageIdx: number]
  /** 编辑关闭（cell blur 或外部 clearEdit） */
  editClosed: []
}>()

/**
 * 本面板当前显示的页号：从父组件传入的 reactive Map 中读自己的 entry。
 *
 * 设计缘由：让响应式追踪发生在子组件内部——只有 map.set(本 panelId, 新值) 才会触发
 * 本 computed 重算，map.set(其他 panelId, ...) 不影响本面板。这就是「坦克履带」
 * 精准响应式的关键：滚动时只 1 个 panelId 真变，对应那一格 DataPanel（含 vxe-grid）
 * 才重渲染，避免「全表格重新加载数据」的开销。
 *
 * ?? -1 兜底：Map 初始化或异常时 entry 可能缺失；越界 pageIdx 由父组件写入 -1，
 * buildPageData 已对越界值返回 EMPTY_ROWS，grid 实例不卸载只显示空。
 */
const pageIdx = computed(() => props.pageIdxMap.get(props.panelId) ?? -1)

/**
 * 本面板当前显示的行数组。
 *
 * 响应式追踪收敛在子组件内部：
 * - 依赖 1：pageIdx（来自 props.pageIdxMap.get(panelId)，只追踪本 panelId 的 key）
 * - 依赖 2：props.dataVersion（父级在 rowCache 变更后 bump，作为非响应式 Map 的代理触发点）
 *
 * 父级 buildPageData 内部用 pageDataMemo 做 O(1) 浅比较命中：当 pageIdx 未变且
 * dataVersion bump 但本页行对象引用都未变时（其他面板的页加载完毕），memoize 直接
 * 返回旧数组引用，vxe-grid 看到引用未变会跳过 calcCellHeight 等强制 reflow。
 */
const data = computed<MeetHr[]>(() => {
  void props.dataVersion
  return props.buildPageData(pageIdx.value)
})

const gridRef = ref<VxeGridInstance>()

function onEditActived() {
  // 透传 pageIdx 给父级：父级用 pageIdx 路由后续 CRUD 操作（哪个 grid 进入编辑）
  emit('editActived', pageIdx.value)
}

function onEditClosed() {
  emit('editClosed')
}

// ==================== 暴露给父级的语义化操作 ====================
//
// 设计缘由：父组件不应直接操作 vxe-grid 实例（脏、紧耦合、易误用）。
// 这里封装父组件需要的 4 个 CRUD 原语，把 grid 实例藏在 DataPanel 内部。
// 父组件用 template ref 数组收集所有 DataPanel 实例，按 panelId 索引取用。

/**
 * 新增：在当前 grid 顶部插入一行并立即进入编辑态。
 * @param emptyRow 父组件构造的空记录（含默认值），由父级决定字段语义
 */
async function insert(emptyRow: MeetHr): Promise<void> {
  const grid = gridRef.value
  if (!grid) return
  const { row } = await grid.insert(emptyRow)
  await grid.setEditRow(row)
}

/**
 * 读取待提交的变更（不修改编辑状态）。
 *
 * 父级保存流程：先读所有面板的 pending changes 收集 API 任务，再统一调 clearEdit。
 * 不在此方法内 clearEdit：父级可能想先校验/聚合多面板变更再决定是否清编辑态。
 */
function getPendingChanges(): { insertRecords: MeetHr[]; updateRecords: MeetHr[] } {
  const grid = gridRef.value
  if (!grid) return { insertRecords: [], updateRecords: [] }
  const { insertRecords, updateRecords } = grid.getRecordset()
  return {
    insertRecords: insertRecords as MeetHr[],
    updateRecords: updateRecords as MeetHr[],
  }
}

/** 读取多选勾选的行（删除用） */
function getSelectedRecords(): MeetHr[] {
  const grid = gridRef.value
  if (!grid) return []
  return grid.getCheckboxRecords() as MeetHr[]
}

/** 关闭编辑态（不还原数据）。保存流程的最后一步 */
async function clearEdit(): Promise<void> {
  await gridRef.value?.clearEdit()
}

/**
 * 取消编辑：clearEdit 让 in-flight 编辑值 commit 到 updateRecords，
 * 再 getRecordset 读完整变更并撤销。
 *
 * 顺序很关键：先 getRecordset 再 clearEdit 会漏掉正在编辑的值
 * （clearEdit 反而把它 commit 进 updateRecords，但还原已过）。
 */
async function cancel(): Promise<void> {
  const grid = gridRef.value
  if (!grid) return
  await grid.clearEdit()
  const { insertRecords, updateRecords } = grid.getRecordset()
  if (insertRecords.length > 0) {
    await grid.remove(insertRecords)
  }
  if (updateRecords.length > 0) {
    // revertData 把行还原到 keepSource 的原始数据，需要 gridOptions.keepSource=true
    await grid.revertData(updateRecords)
  }
}

defineExpose({ insert, getPendingChanges, getSelectedRecords, clearEdit, cancel })
</script>

<template>
  <div
    :class="$style.panel"
    :style="{
      transform: `translateY(${pageIdx * props.pageBlockHeight}px)`,
      height: `${props.pageBlockHeight}px`,
    }"
  >
    <!-- 数据层自带分割条：样式与 InfinitePagesImpl 的 pageDivider 严格一致，
         让用户在 IN_RANGE 滚动时看到"延续"的页码分割条。
         不再用透明占位穿透骨架层——直接渲染真实分割条，避免双层 z-index 的透明 hack。
         OUT_OF_RANGE 时数据层在旧 pageIdx 冻结，骨架层在新 pageIdx 显示分割条，
         两层位于不同 translateY 位置永不重叠，不会出现"双分割条" -->
    <div :class="$style.pageDivider" :style="{ height: `${props.dividerHeight}px` }">
      <span :class="$style.pageDividerText">第 {{ pageIdx + 1 }} 页</span>
    </div>

    <div :class="$style.gridWrapper">
      <vxe-grid
        ref="gridRef"
        v-bind="props.gridOptions"
        height="auto"
        :data="data"
        @edit-actived="onEditActived"
        @edit-closed="onEditClosed"
      />
    </div>
  </div>
</template>

<style module>
/* 数据层面板：absolute 定位 + transform 平移，覆盖在骨架层（z-index 1）之上。
 * - background:#fff 不透明白底：IN_RANGE 时完全盖住骨架层（分割条和 shimmer 都不可见），
 *   让用户视觉焦点在真实数据；OUT_OF_RANGE 时数据层在旧 pageIdx 冻结已滚出视口，
 *   视口内只有骨架层在新 pageIdx，不会出现两层重叠。
 * - z-index: 2：在骨架层之上 */
.panel {
  position: absolute;
  left: 0;
  right: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  will-change: transform;
  z-index: 2;
  background: #fff;
}

/* 分割条：与 InfinitePagesImpl 的 pageDivider 视觉完全一致。
 * 在数据层直接渲染（而非透明占位穿透骨架层），代码更直观、无需透明 hack。
 * 多一个 40px div 的渲染开销可忽略（panelCount 个面板 = panelCount 个 div） */
.pageDivider {
  background: linear-gradient(90deg, #1890ff 0%, #409eff 50%, #1890ff 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.3);
}

.pageDividerText {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 3px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.gridWrapper {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  background: #fff;
}
</style>

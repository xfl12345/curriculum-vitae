<script setup lang="ts">
import type { ValueOf } from 'type-fest'

import { NTabPane, NTabs } from 'naive-ui'
import { computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

import { ROUTER_NAMES } from '@/router/TheConst'

// 三个实现各对应一个子路由。name 用 ROUTER_NAMES 里的强类型常量，
// 避免直接写字符串字面量在重构时漏改；desc 在切换 tab 时显示，
// 让用户一眼看出每种实现的核心取舍（便于对比演示）。
interface TabDef {
  name: ValueOf<typeof ROUTER_NAMES>
  label: string
  desc: string
}

const tabs: TabDef[] = [
  {
    name: ROUTER_NAMES.TEST_VXE_TABLE_PAGED_INDEX,
    label: '基础版',
    desc: 'concat + vxe 自带虚拟滚动 + 滚到底加载下一页',
  },
  {
    name: ROUTER_NAMES.TEST_VXE_TABLE_PAGED_INFINITE_PLAIN,
    label: '朴素无限滚动',
    desc: 'concat 全部数据，无虚拟滚动（反例，会卡）',
  },
  {
    name: ROUTER_NAMES.TEST_VXE_TABLE_PAGED_INFINITE_WINDOW,
    label: '50条窗口+HashMap',
    desc: 'DOM 始终 ~80 行 + Map 缓存 + 自定义滚动壳',
  },
]

const route = useRoute()
const router = useRouter()

// route.name 稳定等于 ROUTER_NAMES 常量值（如 '/test-vxe-table-paged/'，带末尾斜杠），
// 而 route.path 在 hash router 下可能因 URL 形态不同带/不带末尾斜杠，会导致 NTabs
// 高亮比较失败。route.name 类型是 string|symbol|null|undefined，这里收窄成 string。
// 用可写 computed + v-model:value：get 读 route.name 同步到 NTabs，set 触发 router.push
// 反向同步——比分开 :value + @update:value 更紧凑，意图也更清晰（双向同步）。
const activeTab = computed<string>({
  get: () => (typeof route.name === 'string' ? route.name : ''),
  set: (newName) => {
    if (newName !== route.name) {
      void router.push({ name: newName as ValueOf<typeof ROUTER_NAMES> })
    }
  },
})
const activeDesc = computed(() => tabs.find((t) => t.name === route.name)?.desc ?? '')
</script>

<template>
  <div :class="$style.root">
    <header :class="$style.header">
      <h1 :class="$style.title">vxe-table 无限滚动实现对比</h1>
      <NTabs v-model:value="activeTab" type="segment" size="medium" animated>
        <NTabPane v-for="tab in tabs" :key="tab.name" :name="tab.name" :tab="tab.label" />
      </NTabs>
      <p :class="$style.desc">{{ activeDesc }}</p>
    </header>
    <main :class="$style.main">
      <RouterView />
    </main>
  </div>
</template>

<style module>
.root {
  height: 100vh;
  width: 100vw;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.header {
  padding: 12px 16px 0;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.desc {
  margin: 8px 0 12px;
  font-size: 12px;
  color: #888;
}

.main {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
</style>

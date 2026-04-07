<script setup lang="ts">
import type { ValueOf } from 'type-fest'

import { watch } from 'vue'
import { RouterView, useRouter, useRoute } from 'vue-router'

import { ROUTER_NAMES } from '@/router/TheConst'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()
const router = useRouter()
const route = useRoute()
const NEED_INIT_PAGE_SET = new Set<ValueOf<typeof ROUTER_NAMES>>([
  ROUTER_NAMES.LOGIN_PAGE,
  ROUTER_NAMES.CV_ROOT_PAGE,
  ROUTER_NAMES.SETTING_PAGE,
])

watch(
  () => route.path,
  (theNew) => {
    if (NEED_INIT_PAGE_SET.has(theNew as ValueOf<typeof ROUTER_NAMES>)) {
      if (!uiStore.isBrowserInitiated) {
        const currentPath = document.location.hash?.substring(1)
        const jumpTarget = currentPath ?? '/'
        const initPath = ROUTER_NAMES.FIRST_TIME_LOADING_PAGE
        if (currentPath !== initPath) {
          router.replace({ path: initPath, query: { exhibition: 'false', jumpTarget } })
        }
      }
    }
  }
)
</script>

<template>
  <RouterView />
</template>

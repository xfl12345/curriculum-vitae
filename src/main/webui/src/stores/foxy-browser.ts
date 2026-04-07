import type { Writable } from 'type-fest'

import { defineStore } from 'pinia'
import { computed, reactive, ref, watch, readonly } from 'vue'

// 从浏览器只读属性中提取可写的镜像类型
interface FoxyWindowState extends Writable<
  Pick<
    Window,
    | 'innerWidth'
    | 'innerHeight'
    | 'outerWidth'
    | 'outerHeight'
    | 'screenX'
    | 'screenY'
    | 'scrollX'
    | 'scrollY'
    | 'devicePixelRatio'
  >
> {
  screen: Writable<
    Pick<Screen, 'width' | 'height' | 'availWidth' | 'availHeight' | 'colorDepth' | 'pixelDepth'>
  >
}

type FoxyElementMetrics = Writable<
  Pick<
    HTMLElement,
    | 'offsetWidth'
    | 'offsetHeight'
    | 'clientWidth'
    | 'clientHeight'
    | 'scrollWidth'
    | 'scrollHeight'
    | 'scrollTop'
    | 'scrollLeft'
  >
>

type FoxyDocumentState = {
  documentElement: FoxyElementMetrics
  body: FoxyElementMetrics
}

export const useFoxyBrowserStore = defineStore('foxyBrowser', () => {
  const windowState = reactive<FoxyWindowState>({
    innerWidth: globalThis.window.innerWidth,
    innerHeight: globalThis.window.innerHeight,
    outerWidth: globalThis.window.outerWidth,
    outerHeight: globalThis.window.outerHeight,
    screenX: globalThis.window.screenX,
    screenY: globalThis.window.screenY,
    scrollX: globalThis.window.scrollX,
    scrollY: globalThis.window.scrollY,
    devicePixelRatio: globalThis.window.devicePixelRatio,
    screen: {
      width: globalThis.window.screen.width,
      height: globalThis.window.screen.height,
      availWidth: globalThis.window.screen.availWidth,
      availHeight: globalThis.window.screen.availHeight,
      colorDepth: globalThis.window.screen.colorDepth,
      pixelDepth: globalThis.window.screen.pixelDepth,
    },
  })

  const documentState = reactive<FoxyDocumentState>({
    documentElement: {
      offsetWidth: globalThis.document.documentElement.offsetWidth,
      offsetHeight: globalThis.document.documentElement.offsetHeight,
      clientWidth: globalThis.document.documentElement.clientWidth,
      clientHeight: globalThis.document.documentElement.clientHeight,
      scrollWidth: globalThis.document.documentElement.scrollWidth,
      scrollHeight: globalThis.document.documentElement.scrollHeight,
      scrollTop: globalThis.document.documentElement.scrollTop,
      scrollLeft: globalThis.document.documentElement.scrollLeft,
    },
    body: {
      offsetWidth: globalThis.document.body.offsetWidth,
      offsetHeight: globalThis.document.body.offsetHeight,
      clientWidth: globalThis.document.body.clientWidth,
      clientHeight: globalThis.document.body.clientHeight,
      scrollWidth: globalThis.document.body.scrollWidth,
      scrollHeight: globalThis.document.body.scrollHeight,
      scrollTop: globalThis.document.body.scrollTop,
      scrollLeft: globalThis.document.body.scrollLeft,
    },
  })

  function sync() {
    windowState.innerWidth = globalThis.window.innerWidth
    windowState.innerHeight = globalThis.window.innerHeight
    windowState.outerWidth = globalThis.window.outerWidth
    windowState.outerHeight = globalThis.window.outerHeight
    windowState.screenX = globalThis.window.screenX
    windowState.screenY = globalThis.window.screenY
    windowState.scrollX = globalThis.window.scrollX
    windowState.scrollY = globalThis.window.scrollY
    windowState.devicePixelRatio = globalThis.window.devicePixelRatio
    windowState.screen.width = globalThis.window.screen.width
    windowState.screen.height = globalThis.window.screen.height
    windowState.screen.availWidth = globalThis.window.screen.availWidth
    windowState.screen.availHeight = globalThis.window.screen.availHeight
    windowState.screen.colorDepth = globalThis.window.screen.colorDepth
    windowState.screen.pixelDepth = globalThis.window.screen.pixelDepth
    documentState.documentElement.offsetWidth = globalThis.document.documentElement.offsetWidth
    documentState.documentElement.offsetHeight = globalThis.document.documentElement.offsetHeight
    documentState.documentElement.clientWidth = globalThis.document.documentElement.clientWidth
    documentState.documentElement.clientHeight = globalThis.document.documentElement.clientHeight
    documentState.documentElement.scrollWidth = globalThis.document.documentElement.scrollWidth
    documentState.documentElement.scrollHeight = globalThis.document.documentElement.scrollHeight
    documentState.documentElement.scrollTop = globalThis.document.documentElement.scrollTop
    documentState.documentElement.scrollLeft = globalThis.document.documentElement.scrollLeft
    documentState.body.offsetWidth = globalThis.document.body.offsetWidth
    documentState.body.offsetHeight = globalThis.document.body.offsetHeight
    documentState.body.clientWidth = globalThis.document.body.clientWidth
    documentState.body.clientHeight = globalThis.document.body.clientHeight
    documentState.body.scrollWidth = globalThis.document.body.scrollWidth
    documentState.body.scrollHeight = globalThis.document.body.scrollHeight
    documentState.body.scrollTop = globalThis.document.body.scrollTop
    documentState.body.scrollLeft = globalThis.document.body.scrollLeft
  }

  // --- 防抖配置 ---
  const enableSynchronization = ref(true)
  const debounceIntervalMsRef = ref(100)
  const debounceIntervalMs = computed({
    get(): number {
      return debounceIntervalMsRef.value
    },
    set(value: number) {
      debounceIntervalMsRef.value = Math.max(value, 10) // 护栏值 10ms
    },
  })

  let dirtyToken = 0 // 基于 token 的防抖：观察者累加 token，定时器消费 token
  let timerHandle: ReturnType<typeof setInterval> | undefined

  function startTimer(): void {
    stopTimer()
    if (enableSynchronization.value) {
      timerHandle = setInterval(() => {
        if (enableSynchronization.value && dirtyToken > 0) {
          sync()
          dirtyToken >>= 2 // 位运算高性能除以 4 ，指数级下降，快速衰减
        }
      }, debounceIntervalMsRef.value)
    }
  }

  function stopTimer(): void {
    if (timerHandle !== void 0) {
      clearInterval(timerHandle)
      timerHandle = void 0
    }
  }

  // 防抖间隔变更时重启定时器
  watch(debounceIntervalMsRef, () => {
    startTimer()
  })

  watch(
    enableSynchronization,
    (theNew) => {
      if (!theNew) {
        stopTimer()
      } else {
        startTimer()
      }
    },
    {
      immediate: true,
    }
  )

  function markDirty(): void {
    dirtyToken += 1
  }

  // 观察者注册
  const resizeObserver = new ResizeObserver(markDirty)
  globalThis.window.addEventListener('resize', markDirty)
  globalThis.window.addEventListener('load', () => {
    sync() // 确保初始化时无条件同步一次
    resizeObserver.observe(globalThis.document.documentElement)
  })
  globalThis.window.addEventListener('close', () => {
    resizeObserver.unobserve(globalThis.document.documentElement)
  })

  const computedWindow = computed(() => readonly(windowState))
  const computedDocument = computed(() => readonly(documentState))
  return { computedWindow, computedDocument, sync, enableSynchronization, debounceIntervalMs }
})

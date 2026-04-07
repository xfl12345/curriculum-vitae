import { createPinia } from 'pinia'
import { directive } from 'resize-observer-vue'
import { createApp } from 'vue'
import VxeTable from 'vxe-table'
import 'vxe-table/lib/style.css'

import { i18n } from '@/i18n'
import { router } from '@/router'

import App from './App.vue'
import '@/assets/main.css'
import { registerAppAlovaHooks, unregisterAppAlovaHooks } from './model/web'

registerAppAlovaHooks()

const app = createApp(App)
app.directive('resize', directive)
app.use(createPinia()).use(router).use(i18n).use(VxeTable)
app.onUnmount(() => {
  unregisterAppAlovaHooks()
})
app.mount('#app')

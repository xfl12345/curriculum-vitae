import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router";
import HelloWorld from "../page/HelloWorld.vue";
import CvRoot from "../page/CvRoot.vue";
import NotFound from "../page/NotFound.vue";
import VueResizeObserverTest from "../page/VueResizeObserverTest.vue";
import ChatGPTWorks from "../page/ChatGPTWorks.vue";
import LoginPage from "../page/LoginPage.vue";
import TestFontSupport from "../page/TestFontSupport.vue";
import FirstTimeLoadingPage from "../page/FirstTimeLoadingPage.vue";
import TestPage from "../page/TestPage.vue";

type routeNode = Array<RouteRecordRaw>;
const routes: routeNode = [
  { path: "/", redirect: "/cv" },
  { path: "/first-time-loading-page", name: "firstTimeLoadingPage", component: FirstTimeLoadingPage },
  {
    path: "/hello-world",
    name: "HelloWorld",
    component: HelloWorld,
    props: { msg: "Hello Vue 3 + TypeScript + Vite" }
  },
  { path: "/login", name: "login", component: LoginPage },
  { path: "/cv", name: "cv", component: CvRoot },
  { path: "/test-font-support", component: TestFontSupport },
  { path: "/test", component: TestPage },
  {
    path: "/404",
    name: "NotFound",
    component: NotFound
  },
  {
    path: "/:pathMatch(.*)",
    name: "DefaultPage",
    component: NotFound
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;

import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router";
import HelloWorld from "../page/HelloWorld.vue";
import CvRoot from "../page/CvRoot.vue";
import NotFoundPage from "../page/NotFound.vue";
import LoginPage from "../page/LoginPage.vue";
import TestFontSupport from "../page/TestFontSupport.vue";
import FirstTimeLoadingPage from "../page/FirstTimeLoadingPage.vue";
import TestPage from "../page/TestPage.vue";
import IndexPage from "../page/IndexPage.vue";

type routeNode = Array<RouteRecordRaw>;
const routes: routeNode = [
  { path: "/index", name: "index", component: IndexPage },
  { path: "/", redirect: "/cv" },
  {
    path: "/first-time-loading-page",
    name: "firstTimeLoadingPage",
    component: FirstTimeLoadingPage
  },
  {
    path: "/hello-world",
    name: "helloWorldPage",
    component: HelloWorld,
    props: { msg: "Hello Vue 3 + TypeScript + Vite" }
  },
  { path: "/login", name: "login", component: LoginPage },
  { path: "/cv", name: "cv", component: CvRoot },
  { path: "/test-font-support", name: "testFontSupport", component: TestFontSupport },
  { path: "/test", name: "testPage", component: TestPage },
  {
    path: "/404",
    name: "notFoundPage",
    component: NotFoundPage
  },
  {
    path: "/:pathMatch(.*)",
    redirect: "/404"
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;

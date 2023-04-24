import { createApp } from "vue";
import { directive } from "resize-observer-vue";
import App from "./App.vue";
import store from "./store";
import i18n from "./i18n";
import router from "./router";

// import "./assets/css/font.css";

const app = createApp(App);
app.directive("resize", directive);
app.use(store);
app.use(i18n);
app.use(router);
app.mount("#app");

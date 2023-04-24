// index.ts

// import elementUILocale from "element-plus/lib/locale";
import { createI18n } from "vue-i18n";
import index from "./langs";

const i18n = createI18n({
  legacy: false,
  messages: index,
  // locale: localStorage.lang,
  locale: "cn",
  fallbackLocale: "cn"
});
// elementUILocale.index((key, value) => index.t(key, value));

export default i18n;

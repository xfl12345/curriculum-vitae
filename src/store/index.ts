// noinspection JSConstantReassignment

import { createStore } from "vuex";
import type { Buildable } from "ts-essentials";
// import { ResizeObserver } from "resize-observer";
import { getBrowserFirstDefaultFontFamily, getTextSize } from "../components/xfl-common/ts/FontUtils";
import { ClientCookieManager } from "../components/xfl-common/ts/ClientCookieManager";
import { LoginMananger } from "../model/LoginMananger";

const env = import.meta.env ?? ({} as any);

const cookieManager = new ClientCookieManager();
cookieManager.reloadCookie();

const loginManager = new LoginMananger();

const store = createStore({
  state: {
    uiCalculation: {
      rootScale: 8,
      theGlobalDefaultFontSizeInPixel: Math.ceil(getTextSize("xx-large")),
      updateBrowserSelfValue: true,
      document: {
        documentElement: {
          offsetHeight: document.documentElement.offsetHeight,
          offsetWidth: document.documentElement.offsetWidth
        },
        body: {
          scrollWidth: document.body.scrollWidth,
          scrollHeight: document.body.scrollHeight,
          clientWidth: document.body.clientWidth,
          clientHeight: document.body.clientHeight
        }
      },
      window: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        screen: {
          availWidth: window.screen.availWidth,
          availHeight: window.screen.availHeight
        }
      }
    },
    browserDefaultFontFamily: getBrowserFirstDefaultFontFamily(),
    browserInitiated:
      typeof env.VITE_DISABLE_BROWSER_INITIATED === "undefined"
        ? false
        : JSON.parse(env.VITE_DISABLE_BROWSER_INITIATED),
    cookieManager,
    loginManager,
    diyDefaultFontFamilyList: ["Microsoft YaHei UI"],
    diyFontFamilyList: ["楷体", "KaiTi", "华文楷体", "STKaiti"]
  },
  getters: {
    theFontSizeInPixel(state) {
      return state.uiCalculation.theGlobalDefaultFontSizeInPixel;
    },
    theFontSize(state, getters) {
      return getters.theFontSizeInPixel + "px";
    }
  },
  mutations: {
    setRootScale(state, rootScale) {
      console.log("setRootScale", rootScale);
      state.uiCalculation.rootScale = rootScale;
    },
    addFontFamily(state, fontName) {
      state.diyFontFamilyList.push(fontName);
    },
    updateGlobalUiCalculationData(state) {
      const stateDocument: Buildable<Document> = state.uiCalculation.document;
      const stateWindow: Buildable<Window> = state.uiCalculation.window;
      stateDocument.documentElement.offsetHeight = document.documentElement.offsetHeight;
      stateDocument.documentElement.offsetWidth = document.documentElement.offsetWidth;
      stateDocument.body.scrollWidth = document.body.scrollWidth;
      stateDocument.body.scrollHeight = document.body.scrollHeight;
      stateDocument.body.clientWidth = document.body.clientWidth;
      stateDocument.body.clientHeight = document.body.clientHeight;
      stateWindow.innerWidth = window.innerWidth;
      stateWindow.innerHeight = window.innerHeight;
      stateWindow.screen.availWidth = window.screen.availWidth;
      stateWindow.screen.availHeight = window.screen.availHeight;
    },
    setUpdateBrowserSelfValue(state, flag: boolean) {
      state.uiCalculation.updateBrowserSelfValue = flag;
    },
    setBrowserInitiatedFlag(state, flag: boolean) {
      state.browserInitiated = flag;
    },
    setCookie(state, cookie) {
      state.cookieManager.clientCookie = cookie;
      state.cookieManager.saveCookie();
    }
  },

  actions: {},
  modules: {}
});

// const windowInAnyType = window as any;
// windowInAnyType.vuexStoreSetCookie = (cookie: any) => {
//   store.commit("setCookie", cookie);
// };
// windowInAnyType.ssstate = store;

let updateGlobalUiCalculationDataToken = 0;

const debounceTimer = setInterval(() => {
  if (store.state.uiCalculation.updateBrowserSelfValue && updateGlobalUiCalculationDataToken > 0) {
    store.commit("updateGlobalUiCalculationData");
    updateGlobalUiCalculationDataToken >>= 2; // 直接除以 4
  }
}, 100); // 每 100ms 触发一次，防抖

const rootNodeResizeObserver = new ResizeObserver((entries, observer) => {
  updateGlobalUiCalculationDataToken += 1;
});

window.addEventListener("load", (event) => {
  rootNodeResizeObserver.observe(document.documentElement);
});
window.addEventListener("close", (event) => {
  rootNodeResizeObserver.unobserve(document.documentElement);
});

export default store;

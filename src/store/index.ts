import { createStore } from "vuex";
// import { ResizeObserver } from "resize-observer";
import { getBrowserFirstDefaultFontFamily } from "../components/xfl-common/ts/FontUtils";
import { fontSizeCalc } from "../model/FontSizeCalculator";
import { ClientCookieManager } from "../components/xfl-common/ts/ClientCookieManager";

const cookieManager = new ClientCookieManager();
cookieManager.reloadCookie();

const store = createStore({
  state: {
    uiCalculation: {
      rootScale: 7,
      updateBrowserSelfValue: true,
      document: {
        documentElement: {
          offsetHeight: document.documentElement.offsetHeight,
          offsetWidth: document.documentElement.offsetWidth
        },
        body: {
          scrollWidth: document.body.scrollWidth,
          scrollHeight: document.body.scrollHeight
        }
      },
      window: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight
      }
    },
    browserDefaultFontFamily: getBrowserFirstDefaultFontFamily(),
    diyFontFamilyList: ["楷体", "KaiTi", "华文楷体", "STKaiti", "Microsoft YaHei UI"],
    isBrowserInitiated: false,
    cookieManager
  },
  getters: {
    theFontSizeInPixel(state) {
      return fontSizeCalc(state.uiCalculation.rootScale);
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
      const stateDocument = state.uiCalculation.document;
      const stateWindow = state.uiCalculation.window;
      stateDocument.documentElement.offsetHeight = document.documentElement.offsetHeight;
      stateDocument.documentElement.offsetWidth = document.documentElement.offsetWidth;
      stateWindow.innerWidth = window.innerWidth;
      stateWindow.innerHeight = window.innerHeight;
      stateDocument.body.scrollWidth = document.body.scrollWidth;
      stateDocument.body.scrollHeight = document.body.scrollHeight;
    },
    setUpdateBrowserSelfValue(state, flag: boolean) {
      state.uiCalculation.updateBrowserSelfValue = flag;
    },
    setBrowserInitiatedFlag(state, flag: boolean) {
      state.isBrowserInitiated = flag;
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

const rootNodeResizeObserver = new ResizeObserver((entries, observer) => {
  if (store.state.uiCalculation.updateBrowserSelfValue) {
    store.commit("updateGlobalUiCalculationData");
  }
});
window.addEventListener("load", (event) => {
  rootNodeResizeObserver.observe(document.documentElement);
});

export default store;

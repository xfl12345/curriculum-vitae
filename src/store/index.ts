import { createStore } from "vuex";
// import { ResizeObserver } from "resize-observer";
import { getBrowserFirstDefaultFontFamily } from "../components/xfl-common/ts/FontUtils";
import { fontSizeCalc } from "../model/FontSizeCalculator";
import { ClientCookieManager } from "../components/xfl-common/ts/ClientCookieManager";
import { LoginMananger } from "../model/LoginMananger";

const cookieManager = new ClientCookieManager();
cookieManager.reloadCookie();

const loginManager = new LoginMananger();

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
    browserInitiated: false,
    cookieManager,
    loginManager,
    diyDefaultFontFamilyList: ["Microsoft YaHei UI"],
    diyFontFamilyList: ["楷体", "KaiTi", "华文楷体", "STKaiti"]
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

<template>
  <div ref="templateRoot" style="height: 99vh; padding-top: 1vh">
    <div v-if="debugMode" style="position: fixed; top: 0; left: 0; border: hotpink dashed 1px; z-index: 1">
      {{ JSON.stringify(stateWindow) }}
    </div>
    <div
      style="display: flex; justify-content: center"
      :style="{ minWidth: circleProgressBarWidth, minHeight: circleProgressBarWidth }"
    >
      <div style="">
        <circle-progress-bar
          v-slot="slotProps"
          sizing-type="border"
          :progress="progress"
          :progress-max="progressMax"
          :rounded="true"
          :dom-square-box-width="circleProgressBarWidthInPixel"
          :stroke-width-in-pixel="circleProgressBarStrokeWidthInPixel"
          :color-filled="circleProgressBarColorArray"
          :transition-duration-in-seconds="0.3"
          @reached="onOneHundredReached"
        >
          <div style="height: 100%; width: 100%">
            <div v-if="isShowPercentageBox" style="width: 100%; height: 100%">
              <div
                style="
                  position: relative;
                  transition-property: height, font-size, opacity;
                  transition-duration: 0.8s, 0.8s, 1s;
                  transition-timing-function: ease, ease, linear;
                  transition-delay: 0s, 0s, 1s;
                  line-height: 0.8;
                "
                :style="{
                  // opacity: slotProps.isLimitReached ? 0 : 1,
                  height: slotProps.isLimitReached ? '100%' : '50%',
                  // transform: slotProps.isLimitReached ? undefined : 'scale(1, 1.75)',
                  fontSize: slotProps.innerBoxWidthInPixel / (slotProps.isLimitReached ? 2.2 : 2.5) + 'px'
                }"
              >
                <div
                  style="
                    position: absolute;
                    bottom: 0;
                    width: 100%;
                    display: flex;
                    flex-direction: row;
                    justify-content: center;
                  "
                  :style="[slotProps.isLimitReached ? { height: '100%' } : undefined]"
                >
                  <div
                    :style="[
                      slotProps.isLimitReached
                        ? {
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                          }
                        : undefined
                    ]"
                  >
                    <span style="">{{ slotProps.percentage + "%" }}</span>
                  </div>
                </div>
              </div>
              <div
                style="height: 50%; width: 100%; text-align: center"
                :style="{ fontSize: slotProps.innerBoxWidthInPixel / 20 + 'px' }"
              >
                <span style="white-space: pre-wrap">{{ checkItemNameList[checkItemIndex] }}</span>
                <br />
                <div :style="{ opacity: checkItemIndex === 1 ? 1 : 0 }">
                  <div v-if="!fontDetection.isNeedToLoadExtraFont">
                    <span>字体名称：[{{ fontDetection.currentItem.fontName }}]</span>
                    <br />
                    <div>
                      是否支持：[<span
                        :style="{ color: fontDetection.currentItem.isSupport ? 'darkGreen' : 'red' }"
                        >{{ fontDetection.currentItem.isSupport ? "是" : "否" }}</span
                      >]
                    </div>
                  </div>
                  <div v-if="fontDetection.isNeedToLoadExtraFont">{{ fontDetection.loadFontMessage }}</div>
                  <div v-if="!fontDetection.isAllRescueFailed" style="display: inline">
                    <span style="vertical-align: top">字体预览：</span>
                    <canvas
                      ref="canvas4font"
                      :height="slotProps.innerBoxWidthInPixel / 10"
                      :width="slotProps.innerBoxWidthInPixel / 10"
                      style="border: blue solid 1px; vertical-align: text-top"
                    />
                  </div>
                  <div v-if="fontDetection.isAllRescueFailed">
                    <button @click="onAllDone">Yes! Go on!</button>
                  </div>
                </div>
              </div>
            </div>
            <center-box v-if="!isShowPercentageBox">
              <svg
                :width="slotProps.innerBoxWidthInPixel * 0.8"
                :height="slotProps.innerBoxWidthInPixel * 0.6"
              >
                <svg-right-picture-path
                  :offset-x="slotProps.innerBoxWidthInPixel * 0.8 * 0.05"
                  :offset-y="slotProps.innerBoxWidthInPixel * 0.6 * 0.05"
                  :width="slotProps.innerBoxWidthInPixel * 0.8 * 0.9"
                  :height="slotProps.innerBoxWidthInPixel * 0.6 * 0.9"
                  :props-css-style="{
                    fill: 'transparent',
                    strokeWidth: circleProgressBarStrokeWidthInPixel + 'px',
                    stroke: 'aqua',
                    animationTimingFunction: 'liner',
                    transitionDuration: '1s',
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round'
                  }"
                />
              </svg>
            </center-box>
          </div>
        </circle-progress-bar>
        <div v-if="exhibition">
          <button @click="jumpTarget">点我继续转跳</button>
        </div>
        <div v-if="debugMode">
          <br />
          <input v-model="progress" type="number" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="tsx">
import { defineComponent, ref } from "vue";
import { useStore } from "vuex";
import { useRouter } from "vue-router";
import tinygradient from "tinygradient";
import CircleProgressBar from "@/components/xfl-common/vue/CircleProgressBar.vue";
import CenterBox from "@/components/xfl-common/vue/CenterBox.vue";
import SvgRightPicturePath from "@/components/xfl-common/vue/SvgRightPicturePath.vue";
import { applyNewFont2GlobalDom, SupportedFontFamilyDetector } from "@/components/xfl-common/ts/FontUtils";

export default defineComponent({
  components: { SvgRightPicturePath, CenterBox, CircleProgressBar },
  setup(props, ctx) {
    const store = useStore();
    const router = useRouter();

    const templateRoot = ref<HTMLDivElement>();
    const canvas4font = ref<HTMLCanvasElement>();

    return {
      templateRoot,
      store,
      router,
      canvas4font
    };
  },
  data() {
    const progressMax = 100;
    const circleProgressBarColorArray = tinygradient("red", "aqua")
      .hsv(progressMax + 1, "long")
      .map((item) => item.toHexString());
    const checkItemNameList = ["正在检查您的浏览器，请稍等……", "正在检查浏览器对字体支持的情况"];
    return {
      exhibition: false,
      canMount: true,
      debugMode: false,
      progress: 0,
      progressMax,
      circleProgressBarColorArray,
      checkItemIndex: 0,
      checkItemNameList,
      isShowPercentageBox: true,
      isMounted: false,
      fontDetection: {
        currentItem: {
          fontName: "",
          isSupport: false
        },
        isNeedToLoadExtraFont: false,
        loadFontMessage: "",
        isAllRescueFailed: false
      }
    };
  },
  computed: {
    stateWindow() {
      const myself = this;
      return {
        innerWidth: myself.store.state.uiCalculation.window.innerWidth,
        innerHeight: myself.store.state.uiCalculation.window.innerHeight
      };
    },
    circleProgressBarWidthInPixel() {
      const myself = this;
      let result = 1000;
      if (this.isMounted && "clientWidth" in document.body) {
        // 宽度高度谁更大？两者之间选最小。
        result =
          myself.stateWindow.innerWidth < myself.stateWindow.innerHeight
            ? myself.stateWindow.innerWidth
            : myself.stateWindow.innerHeight;

        result -= parseInt(getComputedStyle(this.templateRoot!).paddingTop, 10) << 1;
      }
      return result;
    },
    circleProgressBarWidth() {
      return this.circleProgressBarWidthInPixel + "px";
    },
    circleProgressBarStrokeWidthInPixel() {
      const myself = this;
      const circleWidth = myself.circleProgressBarWidthInPixel;
      let result;
      if (circleWidth >= 900) {
        result = 40;
      } else if (circleWidth > 200) {
        result = circleWidth / 30;
      } else {
        result = 4;
      }

      return result;
    }
  },
  watch: {},
  beforeCreate() {},
  created() {},
  beforeMount() {
    const myself = this;
    myself.exhibition = JSON.parse(myself.$route.query.exhibition as string) as boolean;
    if (!myself.exhibition) {
      if (myself.store.state.browserInitiated) {
        myself.canMount = false;
        myself.router.push({ name: "cv" });
      }
    }
  },
  mounted() {
    const myself = this;
    if (!myself.canMount) {
      return;
    }

    myself.isMounted = true;
    // myself.store.state

    setTimeout(() => {
      myself.checkItemIndex += 1;

      const fontList = myself.store.state.diyFontFamilyList;
      const detector = new SupportedFontFamilyDetector();
      detector.selectedFontCanvas = this.canvas4font!;
      // detector.testChar = "楷";
      detector.testChar = "a";
      detector.defaultFontCanvas.width = detector.selectedFontCanvas.width;
      detector.defaultFontCanvas.height = detector.selectedFontCanvas.height;

      const progressUnit = myself.progressMax / (fontList.length + 1);
      const supportFontStatus = {} as any;
      let i = 0;

      const ptr = {} as any;
      ptr.func = () => {};
      ptr.func = () => {
        if (i >= fontList.length) {
          if (Object.values(supportFontStatus).filter((value) => value).length === 0) {
            myself.fontDetection.loadFontMessage = "由于所有字体均不支持，正在下载额外字体";
            myself.fontDetection.isNeedToLoadExtraFont = true;
            const fontName = "FangZhengKaiTi";

            applyNewFont2GlobalDom(fontName, "url(static/font/FZKTK.TTF)").then((result) => {
              myself.fontDetection.loadFontMessage = "下载成功，并已应用。正在检测能否渲染。";
              // console.log(result);
              myself.store.commit("addFontFamily", fontName);
              if (detector.isSupported(fontName)) {
                myself.onAllDone();
              } else {
                myself.onFailed();
                myself.fontDetection.isAllRescueFailed = true;
                myself.fontDetection.loadFontMessage =
                  "渲染失败。因浏览器不能正常显示字体，界面布局可能混乱，是否继续访问？";
                console.log("Apply new font failed.");
              }
            });
          } else {
            myself.onAllDone();
          }

          return;
        }
        const fontName = fontList[i];
        const currentItem = myself.fontDetection.currentItem;
        currentItem.fontName = fontName;
        const isSupport = detector.isSupported(fontName);
        currentItem.isSupport = isSupport;
        supportFontStatus[fontList[i]] = isSupport;

        // 加百分比的小循环
        const targetProgress = myself.progress + progressUnit;
        const ptr2 = {} as any;
        ptr2.func = () => {};
        ptr2.func = () => {
          if (myself.progress < targetProgress) {
            myself.progress += 1;
            setTimeout(ptr2.func, 20);
          } else {
            // 加完进入下一回合
            i += 1;
            ptr.func();
          }
        };
        ptr2.func();
      };

      ptr.func();
    }, 500);
  },
  beforeUpdate() {},
  updated() {},
  activated() {},
  deactivated() {},
  beforeUnmount() {},
  unmounted() {},
  methods: {
    jumpTarget() {
      const myself = this;
      const tmpJumpTarget = myself.$route.query.jumpTarget as string | undefined;
      const jumpTarget: string = typeof tmpJumpTarget === "undefined" ? "cv" : tmpJumpTarget;
      myself.router.push(jumpTarget);
    },
    onOneHundredReached(reached: boolean) {
      const myself = this;
      if (reached) {
        setTimeout(() => {
          myself.isShowPercentageBox = !reached;
        }, 1000);
      } else {
        myself.isShowPercentageBox = !reached;
      }
    },
    onAllDone() {
      const myself = this;
      myself.store.commit("setBrowserInitiatedFlag", true);
      myself.progress = myself.progressMax;
      if (!myself.exhibition) {
        setTimeout(myself.jumpTarget, 2300);
      }
    },
    onFailed() {
      this.circleProgressBarColorArray = ["#FF0000", "#FF0000"];
    }
  }
});
</script>

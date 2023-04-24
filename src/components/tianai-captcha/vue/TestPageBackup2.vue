<template>
  <div ref="templateRoot">
    <div
      style="
        background-color: #fff;
        width: 278px;
        height: 285px;
        z-index: 999;
        box-sizing: border-box;
        padding: 9px;
        border-radius: 6px;
        box-shadow: 0 0 11px 0 #999999;
      "
    >
      <div style="width: 100%; height: 159px; position: relative">
        <div style="width: 100%; height: 100%; position: absolute; transform: translate(0px, 0px)">
          <img ref="rotateBgImg" style="width: 100%" src="" alt />
        </div>
        <div
          style="height: 100%; position: absolute; transform: rotate(0deg); margin-left: 50px"
          :style="rotateImgDivStyle"
        >
          <img ref="rotateImage" style="height: 100%" src="" alt />
        </div>
      </div>
      <captcha-slider
        ref="captchaSlider"
        :allow-resume="false"
        :bar-height-in-pixel="36"
        :bar-width-in-pixel="260"
        style="margin: 11px 0"
        @moving="movingSlider"
        @move-end="valid"
      />
      <div>
        <div ref="rotateCloseBtn" style="display: inline-block">
          <img style="height: 24px; width: 24px; cursor: pointer" :src="closeIcon" alt />
        </div>
        <div ref="rotateRefreshBtn" style="display: inline-block" @click="refreshCaptcha">
          <img style="height: 24px; width: 24px; cursor: pointer" :src="refreshIcon" alt />
        </div>
      </div>
    </div>
    <br />
    <div :style="{ color: isPassed ? 'darkgreen' : 'red' }">{{ isPassed }}</div>
  </div>
</template>

<script lang="tsx">
import { defineComponent, ref } from "vue";
import axios from "axios";
import { CaptchaConfig } from "../ts/CaptchaConfig";
import CaptchaSlider from "./CaptchaSlider.vue";
import { TianaiTrackEvent } from "../ts/TianaiTrackEvent";
import refreshIcon from "../../icon-park/refresh.svg";
import closeIcon from "../../icon-park/close-one.svg";

export default defineComponent({
  components: { CaptchaSlider },
  props: {},
  emits: [],
  setup(props, ctx) {
    const templateRoot = ref<HTMLDivElement>();

    const rotateBgImg = ref<HTMLImageElement>();
    const rotateImage = ref<HTMLImageElement>();

    const rotateMoveBtn = ref<HTMLDivElement>();
    const rotateCloseBtn = ref<HTMLDivElement>();
    const rotateRefreshBtn = ref<HTMLDivElement>();
    const captchaSlider = ref<InstanceType<typeof CaptchaSlider>>();

    return {
      templateRoot,
      rotateBgImg,
      rotateImage,
      rotateMoveBtn,
      rotateCloseBtn,
      rotateRefreshBtn,
      captchaSlider,
      refreshIcon,
      closeIcon
    };
  },
  data() {
    const myself = this;
    const rotateImgDivStyle: Partial<CSSStyleDeclaration> = {};

    const currentCaptchaConfig: CaptchaConfig = new CaptchaConfig();

    return {
      currentCaptchaId: null,

      currentCaptchaConfig,
      isPrintLog: true,

      rotateImgDivStyle,

      isPassed: false,
      isMovingButton: false
    };
  },
  computed: {
    sliderAvailableOffsetX() {
      const myself = this;
      let result: number;
      if (myself.captchaSlider) {
        return myself.captchaSlider!.buttonAvailableOffsetX;
      }
      return myself.rotateBgImg!.width;
    }
  },
  watch: {},
  beforeCreate() {},
  created() {},
  beforeMount() {},
  mounted() {
    const myself = this;

    myself.refreshCaptcha();
  },
  beforeUpdate() {},
  updated() {},
  activated() {},
  deactivated() {},
  beforeUnmount() {},
  unmounted() {},
  methods: {
    reset() {
      const myself = this;
      myself.captchaSlider!.resetButton();
      myself.rotateImgDivStyle.transform = "rotate(0deg)";
    },
    movingSlider(trackRecord: TianaiTrackEvent) {
      const myself = this;
      const moveX = trackRecord.moveX!;

      myself.rotateImgDivStyle.transform =
        "rotate(" + moveX / (myself.sliderAvailableOffsetX / 360) + "deg)";
    },
    refreshCaptcha() {
      const myself = this;
      myself.reset();
      axios.get("/gen?type=ROTATE").then((response) => {
        const data = response.data;
        myself.currentCaptchaId = data.id;
        const bgImg = myself.rotateBgImg!;
        const sliderImg = myself.rotateImage!;

        bgImg.src = data.captcha.backgroundImage;
        sliderImg.src = data.captcha.sliderImage;
      });
    },
    valid(trackRecord: TianaiTrackEvent) {
      const myself = this;
      const bgImg = myself.rotateBgImg!;
      const sliderImg = myself.rotateImage!;

      const data = {
        bgImageWidth: myself.sliderAvailableOffsetX,
        bgImageHeight: bgImg.height,
        sliderImageWidth: sliderImg.width,
        sliderImageHeight: sliderImg.height,
        startSlidingTime: trackRecord.startTime,
        entSlidingTime: trackRecord.stopTime,
        trackList: trackRecord.tracks
      };

      axios
        .post("/check?id=" + myself.currentCaptchaId, data, {
          headers: {
            "Content-Type": "application/json"
          }
        })
        .then((response) => {
          myself.isPassed = response.data;
          myself.refreshCaptcha();
        });
    }
  }
});
</script>

<template>
  <div
    ref="templateRoot"
    style="
      background-color: #fff;
      /*width: 278px;*/
      /*height: 285px;*/
      z-index: 9999;
      box-sizing: border-box;
      /*padding: 9px;*/
      border-radius: 6px;
      box-shadow: 0 0 11px 0 #999999;
      user-select: none;
    "
    :style="{
      width: boxWidthInPixel + 'px',
      padding: boxPaddingInPixel + 'px',
      borderRadius: boxPaddingInPixel + 'px'
      // borderRadius: boxPaddingInPixel * 3.4142 + 'px'
    }"
  >
    <div
      style="position: relative"
      :style="{ width: backgroudImageWidthInPixel + 'px', height: backgroudImageHeightInPixel + 'px' }"
    >
      <img
        ref="rotateBgImg"
        style="width: 100%; height: 100%; position: absolute"
        :src="backgroundImageSource"
        alt
      />
      <div
        style="
          position: absolute;
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: row;
          justify-content: center;
        "
      >
        <img
          ref="rotateImage"
          style="height: 100%; transform: rotate(0deg)"
          :style="rotateImgDivStyle"
          :src="sliderImageSource"
          alt
        />
      </div>
    </div>
    <captcha-slider
      ref="captchaSlider"
      :allow-resume="false"
      :bar-height-in-pixel="36"
      :bar-width-in-pixel="backgroudImageWidthInPixel"
      style="margin: 11px 0"
      @moving="movingSlider"
      @move-end="valid"
    />
    <div :style="{ height: footerBoxHeight }">
      <img ref="closeBtn" :style="footerBoxButtonStyle" :src="closeIcon" alt="" />
      <img
        ref="refreshBtn"
        :style="footerBoxButtonStyle"
        :src="refreshIcon"
        alt=""
        @click="refreshCaptcha"
      />
    </div>
    <br />
    <div :style="{ color: isPassed ? 'darkgreen' : 'red' }">{{ isPassed }}</div>
  </div>
</template>

<script lang="tsx">
import { defineComponent, PropType, ref } from "vue";
import axios from "axios";
import CaptchaSlider from "./CaptchaSlider.vue";
import { TianaiTrackEvent } from "../ts/TianaiTrackEvent";
import refreshIcon from "../../icon-park/refresh.svg";
import closeIcon from "../../icon-park/close-one.svg";
import { EnumSizingType } from "../../xfl-common/ts/EnumSizingType";

export default defineComponent({
  components: { CaptchaSlider },
  props: {
    sizingType: {
      type: String as PropType<EnumSizingType>,
      default: "border"
    },
    domBoxWidth: {
      type: Number,
      default: 278
    },
    pictureWidthInPixel: {
      type: Number,
      default: 260
    }
  },
  emits: [],
  setup(props, ctx) {
    const templateRoot = ref<HTMLDivElement>();

    const rotateBgImg = ref<HTMLImageElement>();
    const rotateImage = ref<HTMLImageElement>();

    const captchaSlider = ref<InstanceType<typeof CaptchaSlider>>();

    return {
      templateRoot,
      rotateBgImg,
      rotateImage,
      captchaSlider,
      refreshIcon,
      closeIcon
    };
  },
  data() {
    const myself = this;
    const rotateImgDivStyle: Partial<CSSStyleDeclaration> = {};

    return {
      backgroundImageSource: "",
      sliderImageSource: "",
      rotateImgDivStyle,
      currentCaptchaId: "",
      isPassed: false
    };
  },
  computed: {
    boxPaddingInPixel() {
      const myself = this;
      let result = 0;

      switch (myself.sizingType) {
        case "content": {
          result = Math.floor(myself.pictureWidthInPixel * 0.035);
          break;
        }
        case "border":
        default: {
          result = Math.ceil(myself.domBoxWidth * 0.03);
          break;
        }
      }

      return result;
    },
    boxWidthInPixel() {
      const myself = this;
      let result = 0;

      switch (myself.sizingType) {
        case "content": {
          result = myself.boxPaddingInPixel + myself.pictureWidthInPixel;
          break;
        }
        case "border":
        default: {
          result = myself.domBoxWidth;
          break;
        }
      }

      return result;
    },
    boxInnerWidth() {
      const myself = this;
      return myself.boxWidthInPixel - 2 * myself.boxPaddingInPixel;
    },
    sliderAvailableOffsetX() {
      const myself = this;
      if (myself.captchaSlider) {
        return myself.captchaSlider!.buttonAvailableOffsetX;
      }
      return myself.backgroundImageWidthInPixel;
    },
    backgroundImageWidthInPixel() {
      return this.boxInnerWidth;
    },
    backgroundImageHeightInPixel() {
      return Math.floor(this.backgroundImageWidthInPixel * 0.618);
    },
    footerBoxHeightInPixel() {
      return 24;
    },
    footerBoxHeight() {
      return this.footerBoxHeightInPixel + "px";
    },
    footerBoxButtonStyle(): Partial<CSSStyleDeclaration> {
      const myself = this;
      return {
        height: myself.footerBoxHeight,
        width: myself.footerBoxHeight,
        cursor: "pointer",
        verticalAlign: "middle"
      };
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
        myself.backgroundImageSource = data.captcha.backgroundImage;
        myself.sliderImageSource = data.captcha.sliderImage;
        console.log(data);
      });
    },
    valid(trackRecord: TianaiTrackEvent) {
      const myself = this;
      const sliderImg = myself.rotateImage!;

      const data = {
        bgImageWidth: myself.sliderAvailableOffsetX,
        bgImageHeight: myself.backgroundImageHeightInPixel,
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

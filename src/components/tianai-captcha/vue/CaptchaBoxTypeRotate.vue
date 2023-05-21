<template>
  <div
    ref="templateRoot"
    style="
      /*width: 278px;*/
      /*height: 285px;*/
      /*z-index: 9999;*/
      box-sizing: border-box;
      /*padding: 9px;*/
      /*border-radius: 6px;*/
      user-select: none;
    "
    :style="cssStyle"
  >
    <div
      :style="{ width: backgroundImageWidthInPixel + 'px', height: backgroundImageHeightInPixel + 'px' }"
    >
      <div v-if="!isRequestFailed" style="width: 100%; height: 100%; position: relative">
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
      <div
        v-if="isRequestFailed"
        style="width: 100%; height: 100%; white-space: pre-wrap; background-color: black; color: red"
        :style="{ fontSize: footerBoxHeight }"
      >
        {{ requestFailedFeedBack }}
      </div>
    </div>
    <captcha-slider
      ref="captchaSlider"
      :allow-resume="false"
      :bar-height-in-pixel="Math.round(backgroundImageWidthInPixel * 0.382 * 0.382)"
      :bar-width-in-pixel="backgroundImageWidthInPixel"
      :placeholder="placeHolder"
      :props-placeholder-style="{
        fontSize: Math.floor(backgroundImageWidthInPixel * 0.07) + 'px'
      }"
      style="margin: 11px 0"
      @moving="movingSlider"
      @move-end="valid"
    />
    <div
      style="box-sizing: border-box; display: flex; vertical-align: middle"
      :style="{
        height: footerBoxHeightInPixel + boxPaddingInPixel + 'px',
        paddingTop: boxPaddingInPixel + 'px'
      }"
    >
      <img
        ref="closeBtn"
        style="vertical-align: inherit"
        :style="footerBoxButtonStyle"
        :src="closeIcon"
        alt=""
        @click="(event) => $emit('onClickCloseButton', event)"
      />
      <img
        ref="refreshBtn"
        style="vertical-align: inherit"
        :style="footerBoxButtonStyle"
        :src="refreshIcon"
        alt=""
        @click="refreshCaptcha"
      />
      <div
        v-if="enableResultFeedback && actionCount > 0"
        style="vertical-align: inherit; display: inline-block; margin-left: auto"
        :style="{ color: isPassed ? 'darkgreen' : 'red', fontSize: footerBoxHeight }"
      >
        {{ isPassed ? "验证通过" : "验证失败" }}
      </div>
    </div>
  </div>
</template>

<script lang="tsx">
import { defineComponent, PropType, ref } from "vue";
import refreshIcon from "../../icon-park/refresh.svg";
import closeIcon from "../../icon-park/close-one.svg";
import { TianaiTrackEvent } from "../ts/TianaiTrackEvent";
import { EnumSizingType } from "../../xfl-common/ts/EnumSizingType";
import CaptchaSlider from "./CaptchaSlider.vue";
import { ITianaiCaptchaClient, TianaiCaptchaClient } from "../ts/TianaiCaptchaClient";
import { cssMixer } from "../../xfl-common/ts/CssMixer";

const defaultCssStyle: Partial<CSSStyleDeclaration> = {
  backgroundColor: "#fff",
  boxShadow: "0 0 11px 0 #999999"
};

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
    tianaiCaptchaClient: {
      type: Object as PropType<ITianaiCaptchaClient>,
      required: true,
      default: () => {
        const client = new TianaiCaptchaClient();
        client.captchaType = "ROTATE";
        return client;
      }
    },
    pictureWidthInPixel: {
      type: Number,
      default: 260
    },
    placeHolder: {
      type: String,
      default: "拖动滑块完成拼图"
    },
    enableResultFeedback: {
      type: Boolean,
      default: false
    },
    propsCssStyle: {
      type: Object as PropType<Partial<CSSStyleDeclaration>>,
      default: (): Partial<CSSStyleDeclaration> => defaultCssStyle
    }
  },
  emits: ["captchaDone", "onClickCloseButton"],
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
      rotateImgDivStyle,
      backgroundImageSource: myself.tianaiCaptchaClient.backgroundImage,
      sliderImageSource: myself.tianaiCaptchaClient.sliderImage,
      isPassed: false,
      actionCount: 0,
      isRequestFailed: false,
      requestFailedFeedBack: ""
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
          result = myself.pictureWidthInPixel + myself.boxPaddingInPixel * 2;
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
      let result = 0;

      switch (myself.sizingType) {
        case "content": {
          result = myself.pictureWidthInPixel;
          break;
        }
        case "border":
        default: {
          result = myself.boxWidthInPixel - 2 * myself.boxPaddingInPixel;
          break;
        }
      }

      return result;
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
      return Math.round(this.boxInnerWidth * 0.0923);
    },
    footerBoxHeight() {
      return this.footerBoxHeightInPixel + "px";
    },
    footerBoxButtonStyle(): Partial<CSSStyleDeclaration> {
      const myself = this;
      return {
        height: myself.footerBoxHeight,
        width: myself.footerBoxHeight,
        marginRight: myself.footerBoxHeightInPixel / 4 + "px",
        cursor: "pointer"
      };
    },
    cssStyle(): Partial<CSSStyleDeclaration> {
      const myself = this;
      const theStyle: Partial<CSSStyleDeclaration> = cssMixer(defaultCssStyle, myself.propsCssStyle);
      theStyle.width = myself.boxWidthInPixel + "px";
      theStyle.padding = myself.boxPaddingInPixel + "px";
      theStyle.borderRadius = myself.boxPaddingInPixel + "px";
      return theStyle;
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
      myself.isRequestFailed = false;
      myself.tianaiCaptchaClient.refresh().then(
        (obj) => {
          myself.backgroundImageSource = myself.tianaiCaptchaClient.backgroundImage;
          myself.sliderImageSource = myself.tianaiCaptchaClient.sliderImage;
        },
        (season) => {
          // 空白 1px 图片
          const blankImage =
            "data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==";
          myself.sliderImageSource = blankImage;
          myself.backgroundImageSource = blankImage;

          myself.isRequestFailed = true;
          myself.requestFailedFeedBack = "" + season;
        }
      );
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

      const afterAjax = (result: boolean) => {
        myself.isPassed = result;
        myself.actionCount += 1;
        // myself.refreshCaptcha();
        myself.$emit("captchaDone", myself.isPassed);
      };
      myself.tianaiCaptchaClient.validate(data).then(afterAjax, (reason) => {
        myself.isRequestFailed = true;
        myself.requestFailedFeedBack = "" + reason;
        afterAjax(false);
      });
    }
  }
});
</script>

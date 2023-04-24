<template>
  <div ref="templateRoot" class="slider rotate">
    <div class="content">
      <div class="bg-img-div">
        <img ref="rotateBgImg" src="" alt />
      </div>
      <div class="rotate-img-div" :style="rotateImgDivStyle">
        <img ref="rotateImage" src="" alt />
      </div>
    </div>
    <div class="slider-move">
      <div class="slider-move-track">拖动滑块旋转正确位置</div>
      <div
        ref="rotateMoveBtn"
        class="slider-move-btn"
        :style="rotateMoveBtnStyle"
        @mousedown="tianaiCaptchaCore.down"
        @touchstart="tianaiCaptchaCore.down"
      ></div>
    </div>
    <div class="bottom">
      <div ref="rotateCloseBtn" class="close-btn"></div>
      <div ref="rotateRefreshBtn" class="refresh-btn" @click="refreshCaptcha"></div>
    </div>
  </div>
</template>

<script lang="tsx">
import { defineComponent, ref } from "vue";
import axios from "axios";
import { CaptchaConfig } from "../ts/CaptchaConfig";
import { TianaiCaptchaCore } from "../ts/TianaiCaptchaCore";

export default defineComponent({
  components: {},
  props: {},
  emits: [],
  setup(props, ctx) {
    const templateRoot = ref<HTMLDivElement>();

    const rotateBgImg = ref<HTMLImageElement>();
    const rotateImage = ref<HTMLImageElement>();

    const rotateMoveBtn = ref<HTMLDivElement>();
    const rotateCloseBtn = ref<HTMLDivElement>();
    const rotateRefreshBtn = ref<HTMLDivElement>();

    return {
      templateRoot,
      rotateBgImg,
      rotateImage,
      rotateMoveBtn,
      rotateCloseBtn,
      rotateRefreshBtn
    };
  },
  data() {
    const myself = this;
    const rotateImgDivStyle: Partial<CSSStyleDeclaration> = {};
    const rotateMoveBtnStyle: Partial<CSSStyleDeclaration> = {};

    const currentCaptchaConfig: CaptchaConfig = new CaptchaConfig();
    const tianaiCaptchaCore = new TianaiCaptchaCore(
      currentCaptchaConfig,
      (config) => myself.doDown(config),
      (config) => myself.doMove(config),
      (config) => myself.valid(config)
    );

    return {
      currentCaptchaId: null,

      currentCaptchaConfig,
      tianaiCaptchaCore,
      isPrintLog: true,

      rotateImgDivStyle,
      rotateMoveBtnStyle
    };
  },
  computed: {},
  watch: {},
  beforeCreate() {},
  created() {},
  beforeMount() {},
  mounted() {
    const myself = this;

    myself.refreshCaptcha();
    myself.tianaiCaptchaCore.clearAllPreventDefault(myself.templateRoot!);
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
      myself.rotateMoveBtn!.style.backgroundPosition = "-5px 11.79625%";
      myself.rotateMoveBtn!.style.transform = "translate(0px, 0px)";

      myself.rotateImgDivStyle.transform = "rotate(0deg)";
      myself.currentCaptchaId = null;
    },
    refreshCaptcha() {
      const myself = this;
      axios.get("/gen?type=ROTATE").then((response) => {
        const data = response.data;
        myself.reset();
        myself.currentCaptchaId = data.id;
        const bgImg = myself.rotateBgImg!;
        const sliderImg = myself.rotateImage!;

        bgImg.src = data.captcha.backgroundImage;
        sliderImg.src = data.captcha.sliderImage;
        myself.tianaiCaptchaCore.initConfig(206, bgImg.height, sliderImg.width, sliderImg.height, 206);
      });
    },
    valid(captchaConfig: CaptchaConfig) {
      const myself = this;
      const data = {
        bgImageWidth: captchaConfig.bgImageWidth,
        bgImageHeight: captchaConfig.bgImageHeight,
        sliderImageWidth: captchaConfig.sliderImageWidth,
        sliderImageHeight: captchaConfig.sliderImageHeight,
        startSlidingTime: captchaConfig.startTime,
        entSlidingTime: captchaConfig.stopTime,
        trackList: captchaConfig.trackArr
      };
      console.log("valid", captchaConfig, data);

      axios
        .post("/check?id=" + myself.currentCaptchaId, data, {
          headers: {
            "Content-Type": "application/json"
          }
        })
        .then((response) => {
          console.log(response.data);
          if (response.data) {
            // eslint-disable-next-line no-alert
            alert("验证成功!!!");
          }
          myself.refreshCaptcha();
        });
    },
    doDown(config: CaptchaConfig) {
      this.rotateMoveBtnStyle.backgroundPosition = "-5px 31.0092%";
    },
    doMove(config: CaptchaConfig) {
      const myself = this;
      const moveX = config.moveX!;

      myself.rotateMoveBtnStyle.transform = "translate(" + moveX + "px, 0px)";
      myself.rotateImgDivStyle.transform = "rotate(" + moveX / (config.end / 360) + "deg)";
    }
  }
});
</script>

<style scoped>
.slider {
  background-color: #fff;
  width: 278px;
  height: 285px;
  z-index: 999;
  box-sizing: border-box;
  padding: 9px;
  border-radius: 6px;
  box-shadow: 0 0 11px 0 #999999;
}

.slider .content {
  width: 100%;
  height: 159px;
  position: relative;
}

.bg-img-div {
  width: 100%;
  height: 100%;
  position: absolute;
  transform: translate(0px, 0px);
}

.slider-img-div {
  height: 100%;
  position: absolute;
  transform: translate(0px, 0px);
}

.bg-img-div img {
  width: 100%;
}

.slider-img-div img {
  height: 100%;
}

.slider .slider-move {
  height: 60px;
  width: 100%;
  margin: 11px 0;
  position: relative;
}

.slider .bottom {
  height: 19px;
  width: 100%;
}

.refresh-btn,
.close-btn,
.slider-move-track,
.slider-move-btn {
  background: url(https://static.geetest.com/static/ant/sprite.1.2.4.png) no-repeat;
}

.refresh-btn,
.close-btn {
  display: inline-block;
}

.slider-move .slider-move-track {
  line-height: 38px;
  font-size: 14px;
  text-align: center;
  white-space: nowrap;
  color: #88949d;
  -moz-user-select: none;
  -webkit-user-select: none;
  user-select: none;
}

.slider {
  user-select: none;
}

.slider-move .slider-move-btn {
  transform: translate(0px, 0px);
  background-position: -5px 11.79625%;
  position: absolute;
  top: -12px;
  left: 0;
  width: 66px;
  height: 66px;
}

.slider-move-btn:hover,
.close-btn:hover,
.refresh-btn:hover {
  cursor: pointer;
}

.bottom .close-btn {
  width: 20px;
  height: 20px;
  background-position: 0 44.86874%;
}

.bottom .refresh-btn {
  width: 20px;
  height: 20px;
  background-position: 0 81.38425%;
}

.after {
  color: #88949d;
}

.rotate-img-div {
  height: 100%;
  position: absolute;
  transform: rotate(0deg);
  margin-left: 50px;
}

.rotate-img-div img {
  height: 100%;
}
</style>

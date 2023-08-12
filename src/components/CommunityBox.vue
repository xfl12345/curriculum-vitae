<template>
  <div
    ref="templateRoot"
    style="display: flex; justify-content: space-between; white-space: nowrap; vertical-align: middle"
    :style="{ fontSize: theFontSize }"
  >
    <div
      ref="qrCodeLeftBox"
      v-resize:[!isQrCodeLeftBoxUiLoaded]="qrCodeLeftBoxResize"
      style="display: inline-block"
    >
      <url-item
        v-for="item in communityUrlList"
        :key="item"
        :the-font-size-in-pixel="theFontSizeInPixel"
        :the-url="item"
      />
    </div>
    <div v-if="isQrCodeRightBoxUiCanLoad && qrCodeRightBoxHeightInPixel !== 0">
      <vue-qr
        ref="qrCodeWeChat"
        color-light="#89D961"
        color-dark="#76269E"
        style="display: inline-block; vertical-align: top; cursor: pointer; overflow: hidden"
        :style="{ width: qrCodeRightBoxHeight, height: qrCodeRightBoxHeight }"
        :size="qrCodeRightBoxHeightInPixel"
        :margin="0"
        :text="wechatUrl"
        :logo-src="weChatHeadPhoto"
        @click="openUrl(wechatUrl)"
      />
      <div style="display: inline-block" :style="{ height: qrCodeRightBoxHeight }">
        <div
          style="height: 100%; display: flex; flex-direction: column; justify-content: space-around"
          :style="{ lineHeight: fingerEmojiFontSize }"
        >
          <div style="display: inline-block; padding: 0; vertical-align: bottom">
            <span :style="{ fontSize: fingerEmojiFontSize }">👈</span>
            <text-prettier
              style="display: inline-block; vertical-align: inherit"
              :style="{ fontSize: funnyWelcomeBoxFontSize, lineHeight: funnyWelcomeBoxFontSize }"
              content="扫我加微信😉"
            />
          </div>
          <div style="display: inline-block; padding: 0; vertical-align: bottom">
            <text-prettier
              style="display: inline-block; vertical-align: inherit"
              :style="{ fontSize: funnyWelcomeBoxFontSize, lineHeight: funnyWelcomeBoxFontSize }"
              content="扫我拿简历源码"
            />
            <span :style="{ fontSize: fingerEmojiFontSize }">👉</span>
          </div>
        </div>
      </div>
      <vue-qr
        ref="qrCodeCurriculumVitaeSourceCode"
        color-light="orange"
        color-dark="#0057ff"
        style="display: inline-block; vertical-align: top; cursor: pointer; overflow: hidden"
        :style="{ width: qrCodeRightBoxHeight, height: qrCodeRightBoxHeight }"
        :size="qrCodeRightBoxHeightInPixel"
        :margin="0"
        :text="curriculumVitaeSourceCodeUrl"
        @click="openUrl(curriculumVitaeSourceCodeUrl)"
      />
    </div>
  </div>
</template>

<script lang="tsx">
import { computed, defineComponent, PropType, ref } from "vue";
import VueQr from "vue-qr/src/packages/vue-qr.vue";
import TextPrettier from "@/components/xfl-common/vue/TextPrettier.vue";
import UrlItem from "@/components/UrlItem.vue";

export default defineComponent({
  components: {
    UrlItem,
    TextPrettier,
    VueQr
  },
  props: {
    theFontSizeInPixel: {
      type: Number,
      default: 24
    },
    communityUrlList: {
      type: Array as PropType<string[]>,
      default: (): string[] => []
    },
    wechatUrl: {
      type: String,
      default: ""
    },
    weChatHeadPhoto: {
      type: String,
      default: ""
    },
    curriculumVitaeSourceCodeUrl: {
      type: String,
      default: ""
    }
  },
  setup() {
    const templateRoot = ref<HTMLDivElement>();
    const qrCodeLeftBox = ref<HTMLDivElement>();
    const qrCodeWeChat = ref<HTMLDivElement>();
    const qrCodeCurriculumVitaeSourceCode = ref<HTMLDivElement>();

    return {
      templateRoot,
      qrCodeLeftBox,
      qrCodeWeChat,
      qrCodeCurriculumVitaeSourceCode
    };
  },
  data() {
    let qrCodeRightBoxTimeOut: any;
    return {
      isQrCodeRightBoxUiCanLoad: false,
      isQrCodeLeftBoxUiLoaded: false,
      qrCodeLeftBoxHeightInPixel: 0,
      qrCodeRightBoxTimeOut
    };
  },
  computed: {
    qrCodeRightBoxHeightInPixel() {
      const myself = this;
      // console.log("resizeQrCodeRightBoxHeight", myself.qrCodeLeftBoxHeightInPixel);
      return myself.qrCodeLeftBoxHeightInPixel;
    },
    qrCodeRightBoxHeight() {
      return this.qrCodeRightBoxHeightInPixel + "px";
    },
    theFontSize() {
      return this.theFontSizeInPixel + "px";
    },
    fingerEmojiFontSizeInPixel() {
      return Math.ceil((this.qrCodeRightBoxHeightInPixel * 3) / 8);
    },
    fingerEmojiFontSize() {
      return this.fingerEmojiFontSizeInPixel + "px";
      // return this.qrCodeRightBoxHeightInPixel / 5 + "px";
    },
    funnyWelcomeBoxFontSize() {
      return Math.ceil(this.fingerEmojiFontSizeInPixel * 0.6) + "px";
    }
  },
  watch: {
    theFontSizeInPixel(newValue, oldValue) {
      if (newValue !== oldValue) {
        this.isQrCodeRightBoxUiCanLoad = false;
      }
    }
  },
  mounted() {
    const myself = this;
    myself.qrCodeLeftBoxHeightInPixel = this.qrCodeLeftBox!.offsetHeight;
    myself.isQrCodeLeftBoxUiLoaded = true;
  },
  methods: {
    openUrl(url: string) {
      window.open(url);
    },
    qrCodeLeftBoxResize(widthAndHeight: any) {
      const myself = this;
      myself.isQrCodeRightBoxUiCanLoad = false;
      myself.qrCodeLeftBoxHeightInPixel = widthAndHeight.height;
      myself.isQrCodeRightBoxUiCanLoad = true;
    }
  }
});
</script>

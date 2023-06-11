<template>
  <div
    ref="templateRoot"
    style="display: flex; justify-content: space-between; white-space: nowrap; vertical-align: middle"
    :style="{ fontSize: theFontSize }"
  >
    <div ref="qrCodeLeftBox" v-resize:[!isQrCodeLeftBoxUiLoaded]="qrCodeLeftBoxResize">
      <url-item
        v-for="item in communityUrlList"
        :key="item"
        :the-font-size-in-pixel="theFontSizeInPixel"
        :the-url="item"
      />
    </div>
    <div v-if="isQrCodeRightBoxUiCanLoad && qrCodeRightBoxHeight !== 0">
      <vue-qr
        ref="qrCodeWeChat"
        color-light="#89D961"
        color-dark="#76269E"
        style="display: inline-block; vertical-align: top; cursor: pointer"
        :size="qrCodeRightBoxHeight"
        :margin="0"
        :text="wechatUrl"
        :logo-src="weChatHeadPhoto"
        @click="openUrl(wechatUrl)"
      />
      <div style="display: inline-block" :style="{ height: qrCodeRightBoxHeight + 'px' }">
        <div style="height: 100%; display: flex; flex-direction: column; justify-content: space-between">
          <div>
            <span :style="{ fontSize: fingerEmojiFontSize }">👈</span>
            <text-prettier style="display: inline-block; vertical-align: bottom" content="扫我加微信😉" />
          </div>
          <div>
            <text-prettier style="display: inline-block; vertical-align: bottom" content="扫我拿简历源码" />
            <span :style="{ fontSize: fingerEmojiFontSize }">👉</span>
          </div>
          <div></div>
        </div>
      </div>
      <vue-qr
        ref="qrCodeCurriculumVitaeSourceCode"
        color-light="orange"
        color-dark="#0057ff"
        style="display: inline-block; vertical-align: top; cursor: pointer"
        :size="qrCodeRightBoxHeight"
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
import TextPrettier from "./xfl-common/vue/TextPrettier.vue";
import UrlItem from "./UrlItem.vue";

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
      qrCodeLeftBoxHeight: 0,
      qrCodeRightBoxTimeOut
    };
  },
  computed: {
    qrCodeRightBoxHeight() {
      const myself = this;
      // console.log("resizeQrCodeRightBoxHeight", myself.qrCodeLeftBoxHeight);
      return myself.qrCodeLeftBoxHeight;
    },
    theFontSize() {
      return this.theFontSizeInPixel + "px";
    },
    fingerEmojiFontSize() {
      return this.theFontSizeInPixel * 1.8 + "px";
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
    myself.isQrCodeLeftBoxUiLoaded = true;
    myself.qrCodeLeftBoxHeight = this.qrCodeLeftBox!.offsetHeight;
  },
  methods: {
    openUrl(url: string) {
      window.open(url);
    },
    qrCodeLeftBoxResize(widthAndHeight: any) {
      const myself = this;
      myself.isQrCodeRightBoxUiCanLoad = false;
      myself.qrCodeLeftBoxHeight = widthAndHeight.height;
      myself.isQrCodeRightBoxUiCanLoad = true;
      // clearTimeout(myself.qrCodeRightBoxTimeOut);
      // myself.qrCodeRightBoxTimeOut = setTimeout(() => {
      //   if (!myself.isQrCodeRightBoxUiCanLoad) {
      //   }
      // }, 1000);
    }
  }
});
</script>

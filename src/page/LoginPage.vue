<template>
  <div
    ref="templateRoot"
    style="
      background-size: 100% auto;
      background-repeat: repeat-y;
      color: white;
    "
    :style="rootStyle"
  >
    <center-box :x-grow="isCaptchaPanelOpened ? undefined : 1 - 0.618 + ''">
      <div :style="{ padding: theFontSizeInPixel / 2 + 'px' }">
        <div
          class="broderBreath"
          style="box-sizing: border-box; background-color: rgba(0, 0, 0, 0.75)"
          :style="{
            padding: boxPaddingInPixel + 'px',
            // R^2=2*((R-P)^2)  --->  R=(2+sqrt(2))*P
            borderRadius: boxPaddingInPixel * 3.4142 + 'px'
          }"
        >
          <div
            v-if="!isCaptchaPanelOpened"
            style="box-sizing: border-box; height: 100%; border: 1px dashed aqua"
          >
            <div
              style="width: 100%; text-align: center"
              :style="{ fontSize: theFontSizeInPixel * 2 + 'px' }"
            >
              {{ t("word.welcome") }}
            </div>
            <br />
            <div
              style="box-sizing: border-box; width: 100%; border: 1px dashed aqua"
              :style="{ paddingLeft: formDivHorizontalPadding, paddingRight: formDivHorizontalPadding }"
            >
              <xfls-single-line-input
                v-model:the-input-value="phoneNumber"
                :the-font-size-in-pixel="theFontSizeInPixel"
                :the-title="t('word.phoneNumber')"
                the-input-type="number"
              />
              <br />
              <xfls-single-line-input
                v-model:the-input-value="verificationCode"
                :the-font-size-in-pixel="theFontSizeInPixel"
                :the-title="t('word.verificationCode')"
                the-input-type="text"
              >
                <template #inputRight>
                  <div
                    style="background-color: darkgreen; cursor: pointer"
                    :style="{ padding: '0 ' + theFontSizeInPixel / 2 + 'px' }"
                    @click.prevent="
                      () => {
                        if (!isInSmsCoolDown) {
                          isCaptchaPanelOpened = true;
                        }
                      }
                    "
                  >
                    {{ t("message.clickMe2Get") }}
                    <!--<div class="myLoadingRotate" style="display: inline-block">-->
                    <!--  <loading-four theme="outline" size="24" fill="#fff" />-->
                    <!--</div>-->
                  </div>
                </template>
              </xfls-single-line-input>
            </div>
            <br />
            <div
              style="display: flex; justify-content: center"
              :style="{ paddingBottom: theFontSizeInPixel / 2 + 'px' }"
            >
              <button class="mySubmitBtn" style="cursor: pointer">
                {{ t("word.login") }}
              </button>
            </div>
          </div>
          <captcha-box-type-rotate
            v-if="isCaptchaPanelOpened"
            :dom-box-width="360"
            :enable-result-feedback="true"
            style="font-size: initial"
            @on-click-close-button="(args) => (isCaptchaPanelOpened = false)"
            @captcha-done="
              (args) => {
                isCaptchaPassed = args;
                if (isCaptchaPassed) {
                  isCaptchaPanelOpened = false;
                }
              }
            "
          />
        </div>
      </div>
    </center-box>
  </div>
</template>

<script lang="tsx">
import { defineComponent, PropType, ref } from "vue";
import { useStore } from "vuex";
import { useI18n } from "vue-i18n";
import { LoadingFour } from "@icon-park/vue-next";
import yournameDusk from "../assets/pic/yourname_dusk.jpg";
import CenterBox from "../components/xfl-common/vue/CenterBox.vue";
import XflsSingleLineInput from "../components/xfl-common/vue/XflsSingleLineInput.vue";
import CaptchaBoxTypeRotate from "../components/tianai-captcha/vue/CaptchaBoxTypeRotate.vue";

export default defineComponent({
  components: {
    CaptchaBoxTypeRotate,
    XflsSingleLineInput,
    CenterBox
  },
  props: {
    bgImgURL: {
      type: String,
      default: yournameDusk
    }
  },
  setup() {
    const templateRoot = ref<HTMLDivElement>();
    const store = useStore();
    const { t } = useI18n();
    return {
      templateRoot,
      store,
      t
    };
  },
  data() {
    return {
      phoneNumber: "",
      verificationCode: "",
      isCaptchaPanelOpened: false,
      isCaptchaPassed: false,
      smsCoolDownTimeLeft: 0
    };
  },
  computed: {
    // 背景图片 CSS background-image: url (?)
    cssBgImgCode(): string {
      const myself = this;
      return `url('${myself.bgImgURL}')`;
    },
    theFontSizeInPixel(): number {
      return this.store.getters.theFontSizeInPixel;
    },
    theFontSize(): string {
      return this.store.getters.theFontSize;
    },
    boxPaddingInPixel(): number {
      return this.theFontSizeInPixel / 4;
    },
    formDivHorizontalPadding(): string {
      return this.theFontSizeInPixel * 2 + "px";
    },
    isInSmsCoolDown() {
      return this.smsCoolDownTimeLeft > 0;
    },
    rootStyle(): Partial<CSSStyleDeclaration> {
      const myself = this;
      const uiCalculation = myself.store.state.uiCalculation;
      return {
        width: uiCalculation.window.innerWidth + "px",
        height: uiCalculation.window.innerHeight + "px",
        // width: uiCalculation.document.body.scrollWidth + "px",
        // height: uiCalculation.document.body.scrollHeight + "px",
        backgroundImage: myself.cssBgImgCode,
        fontSize: myself.theFontSize
        // minWidth: myself.theFontSizeInPixel * 26 + "px"
      };
    }
  },
  beforeMount() {
    const myself = this;
  },
  mounted() {
    const myself = this;
  },
  unmounted() {
    const myself = this
  }
});
</script>

<style scoped>
.broderBreath {
  animation: load 1.5s infinite alternate;
  animation-delay: -0.25s;
}

@keyframes load {
  0% {
    box-shadow: 0 0 10px 3px rgba(105, 255, 250, 0.5);
  }
  100% {
    box-shadow: 0 0 40px 3px rgb(105, 255, 250);
  }
}

.mySubmitBtn {
  border-style: solid;
  background-color: transparent;
  color: #00b0ff;
}
.mySubmitBtn:hover {
  border-style: outset;
  background-color: #00b0ff;
  color: white;
}
.mySubmitBtn,
.mySubmitBtn:hover {
  font-family: inherit;
  font-size: inherit;
  width: calc(50% * 0.618);
  height: auto;
  border-color: #00b0ff;
  border-radius: v-bind(theFontSize);
  box-shadow: none;
}

@keyframes myLoadingRotateAnimation {
  from {
    transform: rotate(0deg);
  }
  /*50% {*/
  /*  transform: rotate(180deg);*/
  /*}*/
  to {
    transform: rotate(360deg);
  }
}

.myLoadingRotate {
  animation: myLoadingRotateAnimation 3s infinite;
  animation-timing-function: linear;
  animation-delay: 0s;
}
</style>

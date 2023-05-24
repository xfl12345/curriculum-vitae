<template>
  <div
    ref="templateRoot"
    style="background-size: 100% auto; background-repeat: repeat-y; color: white"
    :style="rootStyle"
  >
    <center-box :x-grow="isCaptchaPanelOpened ? undefined : 1 - 0.618 + ''">
      <div ref="contentBox" :style="{ padding: theFontSizeInPixel / 2 + 'px' }">
        <div
          class="broderBreath"
          style="background-color: rgba(0, 0, 0, 0.75)"
          :style="{
            padding: boxPaddingInPixel + 'px',
            // R^2=2*((R-P)^2)  --->  R=(2+sqrt(2))*P
            borderRadius: boxPaddingInPixel * 3.4142 + 'px'
          }"
        >
          <div
            v-if="!isCaptchaPanelOpened && !isSignedIn"
            style="box-sizing: border-box; height: 100%; border: 1px dashed aqua"
          >
            <div
              style="width: 100%; text-align: center"
              :style="{ fontSize: theFontSizeInPixel * 2 + 'px' }"
            >
              <span v-if="loginMessage === ''">{{ t("word.welcome") }}</span>
              <span :style="{ color: isSignedIn ? 'lawngreen' : 'red' }">{{ loginMessage }}</span>
            </div>
            <br />
            <div
              style="box-sizing: border-box; width: 100%; border: 1px dashed aqua"
              :style="{ paddingLeft: formDivHorizontalPadding, paddingRight: formDivHorizontalPadding }"
            >
              <xfls-single-line-input
                ref="inputPhoneNumber"
                v-model:the-input-value="phoneNumber"
                :the-font-size-in-pixel="theFontSizeInPixel"
                :the-title="t('word.phoneNumber')"
                the-input-type="number"
                @on-key-down-enter="onInputPhoneNumberKeyDownEnter"
              />
              <br />
              <xfls-single-line-input
                ref="inputVerificationCode"
                v-model:the-input-value="verificationCode"
                :the-font-size-in-pixel="theFontSizeInPixel"
                :the-title="t('word.verificationCode')"
                the-input-type="text"
                @on-key-down-enter="onInputVerificationCodeKeyDownEnter"
              >
                <template #inputRight>
                  <div
                    style="background-color: darkgreen; text-align: center"
                    :style="{
                      padding: '0 ' + theFontSizeInPixel / 2 + 'px',
                      cursor: isInSmsCoolDown ? 'unset' : 'pointer',
                      backgroundColor: isInSmsCoolDown ? 'grey' : 'darkgreen',
                      minWidth: theFontSizeInPixel * 4 + 'px'
                    }"
                    @click.prevent="
                      () => {
                        if (!isInSmsCoolDown) {
                          isCaptchaPanelOpened = true;
                        }
                      }
                    "
                  >
                    <span>{{ isInSmsCoolDown ? smsCoolDownTimeLeft : t("message.clickMe2Get") }}</span>
                  </div>
                </template>
              </xfls-single-line-input>
            </div>
            <br />
            <div
              style="display: flex; justify-content: center"
              :style="{ paddingBottom: theFontSizeInPixel / 2 + 'px' }"
            >
              <button class="mySubmitBtn" style="cursor: pointer" @click="onClickLoginButton">
                {{ t("word.login") }}
              </button>
            </div>
          </div>
          <captcha-box-type-rotate
            v-if="isCaptchaPanelOpened"
            :dom-box-width="captchaBoxDomWidth"
            :enable-result-feedback="true"
            :tianai-captcha-client="tianaiCaptchaClient"
            :props-css-style="{ fontSize: 'initial', boxShadow: 'none' }"
            @on-click-close-button="(args) => (isCaptchaPanelOpened = false)"
            @captcha-done="onCaptchaDone"
          />
          <div v-if="isSignedIn">
            <div
              style="display: flex; justify-content: center"
              :style="{ paddingBottom: theFontSizeInPixel / 2 + 'px' }"
            >
              <button class="mySubmitBtn" style="cursor: pointer" @click="onClickLogoutButton">
                {{ t("word.logout") }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </center-box>
  </div>
</template>

<script lang="tsx">
import { defineComponent, PropType, ref } from "vue";
import { useStore } from "vuex";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import yournameDusk from "../assets/pic/yourname_dusk.jpg";
import CenterBox from "../components/xfl-common/vue/CenterBox.vue";
import XflsSingleLineInput from "../components/xfl-common/vue/XflsSingleLineInput.vue";
import CaptchaBoxTypeRotate from "../components/tianai-captcha/vue/CaptchaBoxTypeRotate.vue";
import { XFLsCvCaptchaClient } from "../model/XFLsCvCaptchaClient";
import { CountDownHelper } from "../components/xfl-common/ts/CountDownHelper";
import { RequestResult } from "../components/tianai-captcha/ts/TianaiCaptchaClient";

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
    const contentBox = ref<HTMLDivElement>();
    const inputPhoneNumber = ref<InstanceType<typeof XflsSingleLineInput>>();
    const inputVerificationCode = ref<InstanceType<typeof XflsSingleLineInput>>();

    const router = useRouter();
    const store = useStore();
    const { t } = useI18n();
    return {
      templateRoot,
      contentBox,
      inputPhoneNumber,
      inputVerificationCode,
      router,
      store,
      t
    };
  },
  data() {
    const myself = this;
    const tianaiCaptchaClient = new XFLsCvCaptchaClient();
    const smsCoolDownHelper = new CountDownHelper();
    smsCoolDownHelper.timeout = 60 * 1000;

    return {
      phoneNumber: "",
      verificationCode: "",
      isSignedIn: false,
      loginMessage: "",
      isCaptchaPanelOpened: false,
      isCaptchaPassed: false,
      smsCoolDownTimeLeft: 0,
      smsCoolDownHelper,
      tianaiCaptchaClient,
      captchaBoxDomWidth: 360
    };
  },
  computed: {
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
        backgroundImage: `url('${myself.bgImgURL}')`,
        fontSize: myself.theFontSize
        // minWidth: myself.theFontSizeInPixel * 26 + "px"
      };
    }
  },
  beforeMount() {
    const myself = this;
    myself.store.state.loginManager.isAlreadyLogin().then((result: boolean) => {
      myself.isSignedIn = result;
    });
  },
  mounted() {
    const myself = this;
    myself.captchaBoxDomWidth =
      parseInt(getComputedStyle(myself.contentBox!).width, 10) - myself.boxPaddingInPixel * 2;

    myself.tianaiCaptchaClient.verificationPayloadSupplier = () => {
      return new Promise<any>((resolve) => {
        resolve({
          operation: "pull-sms-verification-code",
          data: { phoneNumber: myself.phoneNumber }
        });
      });
    };
  },
  unmounted() {
    const myself = this;
  },
  methods: {
    onInputPhoneNumberKeyDownEnter() {
      const myself = this;
      myself.inputVerificationCode!.inputArea!.click();
    },
    onInputVerificationCodeKeyDownEnter() {
      const myself = this;
      myself.onClickLoginButton();
    },
    onClickLoginButton() {
      const myself = this;
      // console.log(myself.phoneNumber);
      myself.store.state.loginManager
        .loginViaSms(myself.phoneNumber, myself.verificationCode)
        .then((result: any) => {
          myself.isSignedIn = result.success;
          myself.loginMessage = result.message;
          if (result.success) {
            myself.jump2CvPage();
          }
        });
    },
    onClickLogoutButton() {
      const myself = this;
      // console.log(myself.phoneNumber);
      myself.store.state.loginManager.logout().then((result: boolean) => {
        myself.isSignedIn = !result;
        myself.loginMessage = "";
        // console.log(myself.isCaptchaPanelOpened, myself.isSignedIn);
      });
    },
    onCaptchaDone(args: RequestResult) {
      const myself = this;
      myself.isCaptchaPassed = args.success;
      if (myself.isCaptchaPassed) {
        myself.isCaptchaPanelOpened = false;
      }

      if ("data" in args.payload && "coolDownRemainder" in args.payload.data) {
        myself.smsCoolDownHelper.timeout = args.payload.data.coolDownRemainder;
        myself.smsCoolDownHelper.start((eta) => {
          myself.smsCoolDownTimeLeft = Math.floor(eta / 1000);
        });
      }
    },
    jump2CvPage() {
      this.router.push({ name: "cv" });
    }
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
    box-shadow: 0 0 40px 3px rgba(105, 255, 250, 1);
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

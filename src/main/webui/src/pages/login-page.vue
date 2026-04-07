<script setup lang="ts">
import defaultBackgroundImage from '/pic/yourname_dusk.jpg?url&no-inline'
import { useIntervalFn } from '@vueuse/core'
import { computed, onMounted, ref, type CSSProperties } from 'vue'
import { useRouter } from 'vue-router'

import { CenterBox, XflsSingleLineInput, CaptchaBoxTypeRotate } from '@/components'
import { getTextSize } from '@/model/browser/FontUtils'
import { XFLsCvCaptchaClient } from '@/model/web/api/captcha'
import { getPublicWebUiData } from '@/model/web/api/public'
import { ROUTER_NAMES } from '@/router/TheConst'
import { useAuthStore } from '@/stores/auth'
import { useFoxyBrowserStore } from '@/stores/foxy-browser'
import { useI18nStore } from '@/stores/i18n'

const router = useRouter()
const { currentI18nBook } = useI18nStore()
const authStore = useAuthStore()
const foxyBrowserStore = useFoxyBrowserStore()

const fontSizeInPixel = ref(16)
const fontSize = computed(() => fontSizeInPixel.value + 'px')
const fontSizeDouble = computed(() => fontSizeInPixel.value * 2 + 'px')
const fontSizeInPixelHalf = computed(() => fontSizeInPixel.value / 2)
const fontSizeHalf = computed(() => fontSizeInPixelHalf.value + 'px')
const fontSizeInPixelQuarter = computed(() => fontSizeInPixel.value / 4)
const fontSizeQuarter = computed(() => fontSizeInPixelQuarter.value + 'px')

const centerBoxMinWidth = computed(() => fontSizeInPixel.value * 22 + 'px')
const formBoxBorderRadius = computed(() => fontSizeInPixelQuarter.value * 3.4142 + 'px')
const loginMessageColor = computed<CSSProperties['color']>(() => (authStore.signedIn ? 'lawngreen' : 'red'))

const backgroundImage = ref(defaultBackgroundImage)
const extraTextOfChinaICP = ref('')
const captchaClient = new XFLsCvCaptchaClient()

const windowSize = computed(() => ({
  height: foxyBrowserStore.computedWindow.innerHeight,
  width: foxyBrowserStore.computedWindow.innerWidth,
}))
const rootBackgroundImage = computed(() => `url(${backgroundImage.value})`)

const smsCoolDownTimeLeft = ref(0)
const isInSmsCoolDown = computed(() => smsCoolDownTimeLeft.value > 0)
const smsButtonStyle = computed<CSSProperties>(() => ({
  padding: '0 ' + Math.floor(fontSizeInPixelHalf.value) + 'px',
  cursor: isInSmsCoolDown.value ? 'unset' : 'pointer',
  minWidth: fontSizeInPixel.value * 4 + Math.floor(fontSizeInPixel.value) + 'px',
  backgroundColor: isInSmsCoolDown.value ? 'gray' : 'lawngreen',
}))
const { pause: pauseSmsCoolDown, resume: resumeSmsCoolDown } = useIntervalFn(
  () => {
    if (smsCoolDownTimeLeft.value > 0) {
      smsCoolDownTimeLeft.value -= 1
    } else {
      pauseSmsCoolDown()
    }
  },
  1000,
  { immediate: false }
)

const phoneNumber = ref('')
const verificationCode = ref('')
const loginMessage = ref('')
function jump2CvPage() {
  router.push({ name: ROUTER_NAMES.CV_ROOT_PAGE })
}
async function onClickLoginButton() {
  loginMessage.value = ''
  const result = await authStore.loginViaSms(phoneNumber.value, verificationCode.value)
  if (result.success) {
    jump2CvPage()
  } else {
    loginMessage.value = result.message ?? currentI18nBook.static.message.loginFailed
  }
}
function onInputVerificationCodeKeyDownEnter() {
  onClickLoginButton()
}

const codeInputRef = ref<InstanceType<typeof XflsSingleLineInput>>()
function onInputPhoneNumberKeyDownEnter() {
  codeInputRef.value?.$el?.querySelector('input')?.focus()
}

function onClickAnonymousEntryButton() {
  authStore.loginAsAnonymous()
  jump2CvPage()
}

async function onClickLogoutButton() {
  await authStore.logout()
  loginMessage.value = ''
}

const captchaPanelOpened = ref(false)
function onClickGetVerificationCode() {
  if (isInSmsCoolDown.value) return
  captchaPanelOpened.value = true
}
function onClickCloseCaptcha() {
  captchaPanelOpened.value = false
}
function onCaptchaDone() {
  captchaPanelOpened.value = false
  smsCoolDownTimeLeft.value = 60
  resumeSmsCoolDown()
}

const captchaBoxDomWidth = ref(360)
function getTheFontSizeInPixel(): number {
  const globalFontSize = Math.ceil(getTextSize('xx-large'))
  let fontSize = globalFontSize
  if (fontSize * 22 > windowSize.value.width) {
    do {
      fontSize -= 1
    } while (fontSize * 22 > windowSize.value.width)
  }
  fontSize = Math.floor(fontSize)
  if (fontSize === 0) {
    fontSize = Math.round(getTextSize('medium'))
  }
  return fontSize
}
onMounted(async () => {
  fontSizeInPixel.value = getTheFontSizeInPixel()
  captchaBoxDomWidth.value = Math.min(fontSizeInPixel.value * 24, 400)

  try {
    const publicData = await getPublicWebUiData()
    extraTextOfChinaICP.value = publicData.textOfChinaICP ?? ''
    backgroundImage.value = publicData.backgroundPathOfIndexPage ?? defaultBackgroundImage
  } catch (e) {
    console.error(e)
    // 公共数据加载失败不影响登录功能
  }

  await authStore.checkStatus()
})
</script>

<template>
  <div :class="$style.root">
    <div :class="$style.main">
      <CenterBox
        :x-grow="captchaPanelOpened ? '0' : String(1 - 0.618)"
        :x-basis="captchaPanelOpened ? 'auto' : centerBoxMinWidth"
        :x-shrink="captchaPanelOpened ? '1' : '0'"
      >
        <div :class="$style.contentBox">
          <div :class="$style.formBox">
            <div v-if="!captchaPanelOpened && !authStore.signedIn" :class="$style.formPaddingWrapper">
              <div :class="$style.title">
                <span v-if="loginMessage === ''">{{ currentI18nBook.static.word.welcome }}</span>
                <span :class="$style.loginMessageColor">{{ loginMessage }}</span>
              </div>
              <br />
              <div :class="$style.formHorizontalCenter">
                <div :class="$style.sideFlex" />
                <div :class="$style.formContent">
                  <XflsSingleLineInput
                    ref="phoneInputRef"
                    v-model="phoneNumber"
                    :the-font-size-in-pixel="fontSizeInPixel"
                    :the-title="currentI18nBook.static.word.phoneNumber"
                    the-input-type="tel"
                    @key-down-enter="onInputPhoneNumberKeyDownEnter"
                  />
                  <br />
                  <XflsSingleLineInput
                    ref="codeInputRef"
                    v-model="verificationCode"
                    :the-font-size-in-pixel="fontSizeInPixel"
                    :the-title="currentI18nBook.static.word.verificationCode"
                    the-input-type="text"
                    @key-down-enter="onInputVerificationCodeKeyDownEnter"
                  >
                    <template #inputRight>
                      <div :class="[$style.getSmsBtn]" @click.prevent="onClickGetVerificationCode">
                        <span>{{
                          isInSmsCoolDown ? smsCoolDownTimeLeft : currentI18nBook.static.message.clickMe2Get
                        }}</span>
                      </div>
                    </template>
                  </XflsSingleLineInput>
                </div>
                <div :class="$style.sideFlex" />
              </div>
              <br />
              <div :class="$style.buttonRow">
                <button :class="$style.submitBtn" @click="onClickLoginButton">
                  {{ currentI18nBook.static.word.login }}
                </button>
                <button :class="$style.submitBtn" @click="onClickAnonymousEntryButton">
                  {{ currentI18nBook.static.word.anonymousEntry }}
                </button>
              </div>
            </div>
            <CaptchaBoxTypeRotate
              v-if="captchaPanelOpened"
              ref="captchaBoxRef"
              :tianai-captcha-client="captchaClient"
              :box-height-in-pixel="captchaBoxDomWidth"
              :enable-result-feedback="true"
              @captcha-done="onCaptchaDone"
              @click-close-button="onClickCloseCaptcha"
            />
            <div v-if="authStore.signedIn">
              <div :class="$style.buttonRow">
                <button :class="$style.submitBtn" @click="onClickLogoutButton">
                  {{ currentI18nBook.static.word.logout }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </CenterBox>
    </div>
    <div :class="$style.footer">
      <a href="https://github.com/xfl12345" target="_blank">Designed by xfl12345@github.com</a>
      <a v-if="extraTextOfChinaICP" href="https://beian.miit.gov.cn/" target="_blank">{{
        extraTextOfChinaICP
      }}</a>
    </div>
  </div>
</template>

<style module>
/* 根元素：全屏覆盖 */
.root {
  width: v-bind('windowSize.width + "px"');
  height: v-bind('windowSize.height + "px"');
  min-width: v-bind(centerBoxMinWidth);
  background-size: 100% auto;
  background-repeat: repeat-y;
  background-color: black;
  background-image: v-bind(rootBackgroundImage);
  color: white;
  font-size: v-bind(fontSize);
  /* overflow-y: hidden; */
  display: flex;
  flex-direction: column;
}

/* 内容区（含 CenterBox） */
.main {
  width: 100%;
  flex-grow: 1;
}

/* 居中工具盒 */
.contentBox {
  box-sizing: border-box;
  width: 100%;
  padding: v-bind(fontSizeHalf);
}

/* 表单容器：半透明黑底 + 呼吸动画 */
.formBox {
  box-sizing: border-box;
  background-color: rgba(0, 0, 0, 0.75);
  animation: borderBreath 1.5s infinite alternate;
  animation-delay: -0.25s;
  padding: v-bind(fontSizeQuarter);
  border-radius: v-bind(formBoxBorderRadius);
}

@keyframes borderBreath {
  0% {
    box-shadow: 0 0 10px 3px #00b0ff;
  }
  100% {
    box-shadow: 0 0 20px 3px #ff69b4;
  }
}

/* 表单水平居中布局 */
.formPaddingWrapper {
  height: 100%;
}

.title {
  width: 100%;
  text-align: center;
  font-size: v-bind(fontSizeDouble);
}

.loginMessageColor {
  color: v-bind(loginMessageColor);
}

/* 两侧弹性间距 */
.sideFlex {
  flex-basis: v-bind(fontSizeDouble);
}

/* 表单水平居中：左右弹性间距 */
.formHorizontalCenter {
  box-sizing: border-box;
  width: 100%;
  display: flex;
}

/* 表单内容区 */
.formContent {
  box-sizing: border-box;
  flex-grow: 99998;
  flex-shrink: 0;
}

/* 两侧弹性间距 */
.formHorizontalCenter > :first-child,
.formHorizontalCenter > :last-child {
  flex-grow: 1;
  flex-shrink: 1;
}

/* 获取验证码按钮 */
.getSmsBtn {
  box-sizing: border-box;
  text-align: center;
  background-color: v-bind('smsButtonStyle.backgroundColor');
  padding: v-bind('smsButtonStyle.padding');
  cursor: v-bind('smsButtonStyle.cursor');
  min-width: v-bind('smsButtonStyle.minWidth');
}

/* 按钮行 */
.buttonRow {
  display: flex;
  justify-content: space-evenly;
  padding-bottom: v-bind(fontSizeHalf);
}

/* 通用按钮：透明底 + 蓝色边框 */
.submitBtn {
  font-family: inherit;
  font-size: inherit;
  width: calc(50% * 0.618);
  height: auto;
  background-color: transparent;
  border-style: solid;
  border-color: #00b0ff;
  border-radius: v-bind(fontSize);
  color: #00b0ff;
  cursor: pointer;
  box-shadow: none;
}

.submitBtn:hover {
  border-style: outset;
  background-color: #00b0ff;
  color: white;
}

/* 底部信息栏 */
.footer {
  width: 100%;
  flex-shrink: 0;
  background-color: rgba(0, 0, 0, 61.8%);
  display: flex;
  justify-content: space-between;
  flex-direction: row-reverse;
  line-height: 1.6em;
  vertical-align: middle;
  white-space: nowrap;
  flex-basis: v-bind(fontSize);
}

/* 链接样式 */
a {
  color: white;
  text-decoration: none;
}

a:visited {
  color: white;
  text-decoration: none;
}

a:hover {
  color: white;
  text-decoration: none;
}

a:active {
  color: white;
  text-decoration: none;
}
</style>

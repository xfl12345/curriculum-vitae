<script setup lang="ts">
import { computed, onBeforeMount, onMounted, ref, useCssModule, watch, type CSSProperties } from 'vue'
import { useRouter } from 'vue-router'

import type { CurriculumVitaeData } from '@/model/cv/types'

import {
  BasicInfoGlance,
  CommunityBox,
  CvChapter,
  HiddenEggPanel,
  LoadCvDataFailedMessageBox,
  PersonalAbility,
  ProjectExperienceItem,
  RecordItem,
  TextPrettier,
  Vue3MountedHelper,
} from '@/components'
import { CvPageFontSizeHelper } from '@/model/cv/CvPageFontSizeHelper'
import { getCvData } from '@/model/web/api/cv'
import { ROUTER_NAMES } from '@/router/TheConst'
import { useAuthStore } from '@/stores/auth'
import { useFoxyBrowserStore } from '@/stores/foxy-browser'
import { useI18nStore } from '@/stores/i18n'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const authStore = useAuthStore()
const foxyBrowserStore = useFoxyBrowserStore()
const { cvPageTitle: cvPageTitleTranslation } = useI18nStore().currentI18nBook.static
const { devMode } = useSettingsStore()

function jump2IndexPage() {
  router.push({ name: ROUTER_NAMES.HOME })
}

const PAPER_WIDTH_MM = 210
const PAPER_HEIGHT_MM = 297

// ── CV Data ──
const cvData = ref<Partial<CurriculumVitaeData>>({})
const isCvDataLoaded = computed(() => 'basicInformation' in cvData.value)
const isLoadCvDataFailed = ref(false)
const isReloadingCvData = ref(false)
const loadCvDataFailedMessage = ref('')

type ResponseBoxObject = { response: Response }
async function refreshCvData() {
  isReloadingCvData.value = true
  isLoadCvDataFailed.value = false
  cvData.value = {}
  try {
    cvData.value = await getCvData(authStore.isAnonymous)
  } catch (reason) {
    if (reason instanceof Error) {
      loadCvDataFailedMessage.value = reason?.message ?? String(reason)
    } else if ('response' in (reason as ResponseBoxObject)) {
      const { response } = reason as ResponseBoxObject
      if (response.status === 403) {
        loadCvDataFailedMessage.value = '代码 403 。您无权访问简历数据。'
      }
    }
    isLoadCvDataFailed.value = true
  } finally {
    isReloadingCvData.value = false
  }
}

// ── Scale & Font Size ──
const rootScale = ref(7)
const initialRootScale = ref(7)
function resetRootScale() {
  rootScale.value = initialRootScale.value
}

onBeforeMount(() => {
  const windowWidth = foxyBrowserStore.computedWindow.innerWidth
  rootScale.value = Math.floor(windowWidth / PAPER_WIDTH_MM)
  if ((rootScale.value + 0.5) * PAPER_WIDTH_MM <= windowWidth) {
    rootScale.value += 0.5
  }
  if (rootScale.value < 5) {
    rootScale.value = 5
  }
  initialRootScale.value = rootScale.value
})

const theFontSizeInPixel = ref(36)
const theFontSize = computed(() => theFontSizeInPixel.value + 'px')
const cvBoxWidthInPixel = computed(() => Math.ceil(PAPER_WIDTH_MM * rootScale.value))
const cvBoxHeightInPixel = computed(() => Math.ceil(PAPER_HEIGHT_MM * rootScale.value))

const cvBoxMounted = ref(false)
let cvPageFontSizeHelper: CvPageFontSizeHelper | null = null
const adjustFontSizeActionToken = ref(0)
const adjustingFontSize = ref('')
const isAdjustingFontSize = computed(() => adjustingFontSize.value !== '')
let taskIdSeq = 1
function adjustFontSize() {
  adjustFontSizeActionToken.value += 1
  if (!cvBoxMounted.value || isAdjustingFontSize.value) return
  taskIdSeq += 1

  const taskId = '' + taskIdSeq
  adjustingFontSize.value = taskId
  if (adjustingFontSize.value !== taskId) return

  cvPageFontSizeHelper?.adjustFontSize()
}

const cvBoxBody = ref<HTMLElement>()
function initFontSizeHelper() {
  cvPageFontSizeHelper = new CvPageFontSizeHelper({
    getCvBoxWidthInPixel: () => cvBoxWidthInPixel.value,
    getCvBoxHeightInPixel: () => cvBoxHeightInPixel.value,
    getScrollWidth: () => cvBoxBody.value?.scrollWidth ?? 0,
    getScrollHeight: () => cvBoxBody.value?.scrollHeight ?? 0,
    getFontSize: () => theFontSizeInPixel.value,
    setFontSize: (fontSize: number) => {
      theFontSizeInPixel.value = fontSize
    },
    isNeedRestart: () => adjustFontSizeActionToken.value > 0,
    onRestarted: () => {
      adjustFontSizeActionToken.value = 0
    },
    onFinished: () => {
      adjustingFontSize.value = ''
    },
  })
}
const jump2LoginPage = () => router.push({ name: ROUTER_NAMES.LOGIN_PAGE })
onMounted(async () => {
  initFontSizeHelper()

  if (!authStore.signedIn) {
    jump2LoginPage()
    return
  }

  if (!isCvDataLoaded.value) {
    await refreshCvData()
  }
})

function onCvBoxMounted() {
  cvBoxMounted.value = true
  adjustFontSize()
}

watch(rootScale, (newValue, oldValue) => {
  if (newValue !== oldValue) {
    adjustFontSize()
  }
})

// ── Hidden Egg ──
const isHiddenEggPanelOpened = ref(false)
const openHiddenEggPanel = () => (isHiddenEggPanelOpened.value = true)

// ── Layout ──
const cssModule = useCssModule()
type CssModuleKey = keyof typeof cssModule
const cvBoxParentLayoutClass = computed<CssModuleKey>(() => {
  const windowInnerWidth = foxyBrowserStore.computedWindow.innerWidth
  const screenAvailWidth = foxyBrowserStore.computedWindow.screen.availWidth
  if (
    cvBoxWidthInPixel.value < screenAvailWidth &&
    cvBoxWidthInPixel.value < windowInnerWidth &&
    !isAdjustingFontSize.value
  ) {
    return cssModule.cvBoxParentFoxy
  }

  return cssModule.cvBoxParentDefault
})

const cvBoxStyle = computed<CSSProperties>(() => ({
  justifyContent: isAdjustingFontSize.value ? void 0 : 'center',
}))
</script>

<template>
  <div ref="templateRoot" :class="$style.root">
    <div v-if="isCvDataLoaded" :class="[$style.cvBoxParent, cvBoxParentLayoutClass]">
      <div ref="cvBox" :class="[$style.cvBox, { [$style.cvBoxDebug]: devMode }]">
        <!-- 简历主体开始 -->
        <div ref="cvBoxBody" :class="[$style.cvBoxBody, { [$style.cvBoxBodyDebug]: devMode }]">
          <!--基本信息-->
          <CvChapter
            :the-font-size-in-pixel="theFontSizeInPixel"
            :the-title="cvPageTitleTranslation.basicInformation"
          >
            <template #default>
              <BasicInfoGlance
                :the-font-size-in-pixel="theFontSizeInPixel"
                :basic-information="cvData.basicInformation"
                @open-hidden-egg-panel="openHiddenEggPanel"
              />
            </template>
            <template #slogan>
              <div :class="$style.eggTrigger">
                <span :class="$style.eggEmoji" @click="openHiddenEggPanel">🌼</span>
              </div>
            </template>
          </CvChapter>
          <!--交个朋友-->
          <CvChapter
            v-if="cvData.community && 'communityUrlList' in cvData.community"
            :the-font-size-in-pixel="theFontSizeInPixel"
            :the-title="cvPageTitleTranslation.community"
            the-slogan="Talk is cheap, show me the code!"
          >
            <CommunityBox :community="cvData.community" :the-font-size-in-pixel="theFontSizeInPixel" />
          </CvChapter>
          <!--履历-->
          <CvChapter
            v-if="cvData.journey && cvData.journey.length"
            :the-font-size-in-pixel="theFontSizeInPixel"
            :the-title="cvPageTitleTranslation.journey"
          >
            <RecordItem
              v-for="item in cvData.journey"
              :key="item.id"
              :the-font-size-in-pixel="theFontSizeInPixel"
              :the-period="item.period"
              :the-header-center="item.headerCenter"
              :the-header-right="item.headerRight"
              :the-body="item.body ?? ''"
            />
          </CvChapter>
          <!--项目经历-->
          <CvChapter
            v-if="cvData.projectExperience && cvData.projectExperience.length"
            :the-font-size-in-pixel="theFontSizeInPixel"
            :the-title="cvPageTitleTranslation.projectExperience"
          >
            <ProjectExperienceItem
              v-for="item in cvData.projectExperience"
              :key="item.id"
              :the-font-size-in-pixel="theFontSizeInPixel"
              :the-period="item.period"
              :the-name="item.name"
              :the-technology-stack="item.technologyStack"
              :the-body="item.body ?? ''"
            />
          </CvChapter>
          <!--技能证书-->
          <CvChapter
            v-if="cvData.certificate && cvData.certificate.length"
            :the-font-size-in-pixel="theFontSizeInPixel"
            :the-title="cvPageTitleTranslation.certificate"
          >
            <TextPrettier
              v-for="item in cvData.certificate"
              :key="item.id"
              :content="item.content"
              :class="$style.chapterFontSize"
            />
          </CvChapter>
          <!--技能水平-->
          <CvChapter
            v-if="cvData.skillDegree && cvData.skillDegree.length"
            :the-font-size-in-pixel="theFontSizeInPixel"
            :the-title="cvPageTitleTranslation.skillDegree"
          >
            <PersonalAbility
              :the-font-size-in-pixel="theFontSizeInPixel"
              :skill-degree-list="cvData.skillDegree"
            />
          </CvChapter>
          <!--折腾碎念-->
          <CvChapter
            v-if="cvData.interestingBlog && cvData.interestingBlog.length"
            :the-font-size-in-pixel="theFontSizeInPixel"
            :the-title="cvPageTitleTranslation.interestingBlog"
          >
            <div :class="$style.chapterFontSize">
              <ul :class="$style.blogList">
                <li v-for="item in cvData.interestingBlog" :key="item.id">
                  <TextPrettier :content="item.content" />
                </li>
              </ul>
            </div>
          </CvChapter>
          <!--自我评价-->
          <CvChapter
            v-if="cvData.selfAppraisal"
            :the-font-size-in-pixel="theFontSizeInPixel"
            :the-title="cvPageTitleTranslation.selfAppraisal"
          >
            <TextPrettier :class="$style.chapterFontSize" :content="cvData.selfAppraisal" />
          </CvChapter>
          <!-- Mount detection: trigger font adjustment after DOM renders -->
          <Vue3MountedHelper @mounted="onCvBoxMounted" />
        </div>
        <!-- 简历主体结束 -->
      </div>
    </div>
    <HiddenEggPanel
      v-model:is-panel-opened="isHiddenEggPanelOpened"
      v-model:root-scale="rootScale"
      @jump2-index-page="jump2IndexPage"
      @reset-root-scale="resetRootScale"
      @refresh-cv-data="refreshCvData"
    />
    <LoadCvDataFailedMessageBox
      v-if="isLoadCvDataFailed"
      :the-font-size-in-pixel="theFontSizeInPixel"
      :message="loadCvDataFailedMessage"
      @jump2-login-page="jump2LoginPage"
      @refresh-cv-data="refreshCvData"
    />
  </div>
</template>

<style module>
.root {
  display: flex;
  position: relative;
}
.cvBoxParent {
  display: flex;
}
.cvBoxParentFoxy {
  justify-content: center;
  width: 100%;
  height: 100%;
}
.cvBoxParentDefault {
  justify-content: flex-start;
}
.cvBox {
  box-sizing: border-box;
  vertical-align: top;
  display: flex;
  min-width: calc(v-bind('cvBoxWidthInPixel') * 1px);
  width: calc(v-bind('cvBoxWidthInPixel') * 1px);
  height: calc(v-bind('cvBoxHeightInPixel') * 1px);
  justify-content: v-bind('cvBoxStyle.justifyContent');
}
.cvBoxDebug {
  border: 1px dashed aqua;
}
.cvBoxBody {
  box-sizing: border-box;
  display: inline-block;
}
.cvBoxBodyDebug {
  border: 1px dashed hotpink;
}
.eggTrigger {
  text-align: right;
  line-height: v-bind(theFontSize);
}
.eggEmoji {
  cursor: pointer;
  font-size: v-bind(theFontSize);
}
.blogList {
  margin: 0;
  padding: 0 v-bind(theFontSize);
}
.chapterFontSize {
  font-size: v-bind(theFontSize);
}
</style>

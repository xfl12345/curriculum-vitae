<template>
  <div
    ref="templateRoot"
    v-resize="cvBoxResize"
    style="display: flex; justify-content: flex-start; position: relative"
    :style="rootNodeStyle"
  >
    <div
      v-if="isCvDataLoaded"
      style="display: flex; width: 100%; height: 100%"
      :style="[
        cvBoxParentStyle,
        {
          // minHeight: isHiddenEggPanelOpened ? uiCalculation.fullscreen.height : undefined,
          // minWidth: isHiddenEggPanelOpened ? uiCalculation.fullscreen.width : undefined
        }
      ]"
    >
      <div ref="cvBox" style="box-sizing: border-box" :style="cvBoxStyle">
        <!--
        <div style="width: 100%" :style="{ fontSize: theFontSizeInPixel + 'px' }">
          一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十
        </div>
        -->
        <!--  font-family: 'KaiTi', serif;    -->
        <!--   -->
        <cv-chapter
          :the-font-size-in-pixel="theFontSizeInPixel"
          :the-title="t('word.xfl_title_basic_information')"
        >
          <template #default>
            <basic-info-glance
              :the-font-size-in-pixel="theFontSizeInPixel"
              :basic-information="cvData.basicInformation"
              :face-photo="cvData.basicInformation.facePhoto"
            />
          </template>
          <template #slogan>
            <div style="text-align: right">
              <span style="cursor: pointer" :style="{ fontSize: theFontSize }" @click="openHiddenEggPanel"
                >🌼</span
              >
            </div>
          </template>
        </cv-chapter>
        <cv-chapter
          :the-font-size-in-pixel="theFontSizeInPixel"
          :the-title="t('word.xfl_title_community')"
          the-slogan="Talk is cheap,show me the code!"
        >
          <community-box v-bind="cvData.community" :the-font-size-in-pixel="theFontSizeInPixel" />
        </cv-chapter>
        <cv-chapter :the-font-size-in-pixel="theFontSizeInPixel" :the-title="t('word.xfl_title_journey')">
          <record-item
            v-for="item in cvData.journey"
            :key="item.id"
            :the-font-size-in-pixel="theFontSizeInPixel"
            :the-period="item.period"
            :the-header-center="item.headerCenter"
            :the-header-right="item.headerRight"
            :the-body="item.body"
          />
        </cv-chapter>
        <cv-chapter
          :the-font-size-in-pixel="theFontSizeInPixel"
          :the-title="t('word.xfl_title_certificate')"
        >
          <text-prettier
            v-for="item in cvData.certificate"
            :key="item.id"
            :content="item.content"
            :style="{ fontSize: theFontSize }"
          />
        </cv-chapter>
        <cv-chapter
          :the-font-size-in-pixel="theFontSizeInPixel"
          :the-title="t('word.xfl_title_skill_degree')"
        >
          <personal-ability
            v-for="item in cvData.skillDegree"
            :key="item.skillName"
            :the-font-size-in-pixel="theFontSizeInPixel"
            :the-skill="item.skillName"
            :degree="item.degree"
          />
        </cv-chapter>
        <cv-chapter :the-font-size-in-pixel="theFontSizeInPixel" :the-title="t('word.xfl_title_blog')">
          <div :style="{ fontSize: theFontSize }">
            <ul style="margin: 0" :style="{ padding: '0 ' + theFontSize }">
              <li v-for="item in cvData.interestingBlog" :key="item.id">
                <text-prettier :content="item.content" />
              </li>
            </ul>
          </div>
        </cv-chapter>
        <cv-chapter
          :the-font-size-in-pixel="theFontSizeInPixel"
          :the-title="t('word.xfl_title_self_appraisal')"
        >
          <text-prettier :style="{ fontSize: theFontSize }" :content="cvData.selfAppraisal" />
        </cv-chapter>
      </div>
    </div>
    <hidden-egg-panel
      v-model:is-panel-opened="isHiddenEggPanelOpened"
      v-model:root-scale="rootScale"
      :the-font-size-in-pixel="theFontSizeInPixel"
      @jump2-login-page="jump2LoginPage"
      @reset-root-scale="resetRootScale"
    />
    <div
      v-if="isLoadCvDataFailed"
      :style="{
        fontSize: store.getters.theFontSize
      }"
    >
      <div>浏览器加载数据失败，原因如下：</div>
      <div ref="loadCvDataFailedMessageBox" style="border: hotpink dashed 1px; display: inline-block">
        {{ loadCvDataFailedMessage }}
      </div>
      <br />
      <button
        style="cursor: pointer; font-size: inherit"
        :style="{
          borderRadius: store.getters.theFontSize
        }"
        @click="jump2LoginPage"
      >
        转跳登录界面
      </button>
    </div>
  </div>
</template>

<script lang="tsx">
import { defineComponent, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useStore } from "vuex";
import { useRouter } from "vue-router";
import { NSpace, NSlider, NConfigProvider, NGlobalStyle } from "naive-ui";
import CenterBox from "../components/xfl-common/vue/CenterBox.vue";
import CvChapter from "../components/CvChapter.vue";
import RecordItem from "../components/RecordItem.vue";
import TextPrettier from "../components/xfl-common/vue/TextPrettier.vue";
import CommunityBox from "../components/CommunityBox.vue";
import BasicInfoGlance from "../components/BasicInfoGlance.vue";
import PersonalAbility from "../components/PersonalAbility.vue";
import { CurriculumVitaeData } from "../tsmod/CurriculumVitaeData";
import { getCurriculumVitaeData, isSignedIn } from "../model/SecretDataApi";
import { fontSizeCalc } from "../model/FontSizeCalculator";
import { paperA4Standard } from "../assets/json/common.json";
import HiddenEggPanel from "../components/HiddenEggPanel.vue";

export default defineComponent({
  components: {
    HiddenEggPanel,
    BasicInfoGlance,
    CommunityBox,
    CvChapter,
    // CenterBox,
    // NSpace,
    // NSlider,
    // NConfigProvider,
    // // NThemeEditor,
    // NGlobalStyle,
    PersonalAbility,
    RecordItem,
    TextPrettier
  },
  setup() {
    const { t } = useI18n();
    const store = useStore();
    const router = useRouter();

    const templateRoot = ref<HTMLDivElement>();
    const loadCvDataFailedMessageBox = ref<HTMLDivElement>();

    return {
      templateRoot,
      t,
      store,
      router,
      loadCvDataFailedMessageBox
    };
  },
  data() {
    const myself = this;
    const rootNodeStyle: Partial<CSSStyleDeclaration> = {};
    const cvBoxParentStyle: Partial<CSSStyleDeclaration> = {};
    const cvData: Partial<CurriculumVitaeData> = {};
    return {
      rootNodeStyle,
      cvBoxParentStyle,
      isReloadingCvData: false,
      isHiddenEggPanelOpened: false,
      isLoadCvDataFailed: false,
      cvData,
      rootScale: 7,
      loadCvDataFailedMessage: ""
    };
  },
  computed: {
    uiCalculation() {
      const fullscreen = {
        width: "100vw",
        height: "100vh"
      };

      if (window && window.screen) {
        if (window.screen.width > window.screen.height) {
          fullscreen.width = window.screen.width + "px";
          fullscreen.height = window.screen.height + "px";
        } else {
          fullscreen.height = window.screen.width + "px";
          fullscreen.width = window.screen.height + "px";
        }
      }

      return {
        fullscreen
      };
    },
    isCvDataLoaded() {
      return "basicInformation" in this.cvData;
    },
    // rootScale: {
    //   get() {
    //     return this.store.state.uiCalculation.rootScale;
    //   },
    //   set(value: number) {
    //     this.store.commit("setRootScale", value);
    //   }
    // },
    theFontSizeInPixel() {
      return fontSizeCalc(this.rootScale);
    },
    theFontSize() {
      return this.theFontSizeInPixel + "px";
    },
    // rootNodeStyle() {
    //   const myself = this;
    //
    //   let justifyContent = "center";
    //   if (typeof myself.templateRoot !== "undefined" && myself.templateRoot.offsetWidth > 1700) {
    //     justifyContent = "flex-start";
    //   }
    //
    //   return {
    //     justifyContent
    //     // padding: paddingInPixel + "px"
    //   };
    // },
    cvBoxStyle(): Partial<CSSStyleDeclaration> {
      const myself = this;
      const standard = {
        width: paperA4Standard.size.widthInMillimetre,
        height: paperA4Standard.size.heightInMillimetre
      };
      // // 0.382 = 1 - 0.618
      // // 企图使边距合理化（黄金分割）
      // let paddingInPixel = Math.floor(standard.width * myself.rootScale * 0.382 * 0.382);
      // // 修改成偶数
      // if ((paddingInPixel & 0x1) === 1) {
      //   paddingInPixel += 1;
      // }

      const width = standard.width * myself.rootScale + "px";

      return {
        minWidth: width,
        width,
        height: standard.height * myself.rootScale + "px"
      };
    }
  },
  watch: {
    rootScale(newValue, oldValue) {
      if (newValue !== oldValue) {
        console.log("rootScale: " + newValue);
      }
    }
  },
  created() {
    const myself = this;
    myself.rootScale = myself.store.state.uiCalculation.rootScale;
  },
  beforeMount() {
    const myself = this;
    if (!myself.store.state.isBrowserInitiated) {
      myself.jump2InitPage();
    } else if (!isSignedIn()) {
      myself.jump2LoginPage();
    } else if (!("basicInformation" in myself.cvData)) {
      myself.refreshCvData();
    }
  },
  mounted() {
    const myself = this;
    // console.log("onMounted - start");
    // const windowAsAny = window as any;
    // windowAsAny.ttt = myself;
    // console.log(myself.store.state.diyFontFamilyList);
    // console.log("onMounted - end");
  },
  unmounted() {
    const myself = this;
    // document.body.style.height = myself.documentBodyStyleBackup.height;
    // document.body.style.width = myself.documentBodyStyleBackup.width;
  },
  methods: {
    openUrl(url: string) {
      window.open(url);
    },
    jump2LoginPage() {
      this.router.push("login");
    },
    jump2InitPage() {
      this.router.push("first-time-loading-page");
    },
    refreshCvData() {
      const myself = this;
      myself.isLoadCvDataFailed = false;
      myself.cvData = {};
      getCurriculumVitaeData()
        .then(
          (responseData) => {
            myself.cvData = responseData;
          },
          (response) => {
            console.log("onReject", response);
            if (response.response && response.response.status === 403) {
              myself.loadCvDataFailedMessage = "代码 403 。您无权访问简历数据。";
            } else {
              myself.loadCvDataFailedMessage = response.message;
            }
            myself.isLoadCvDataFailed = true;
          }
        )
        .catch((reason) => {
          console.log("onException", reason);
          myself.loadCvDataFailedMessage = reason;
          myself.isLoadCvDataFailed = true;
        });
    },
    openHiddenEggPanel() {
      // this.store.commit("setUpdateBrowserSelfValue", false);
      this.isHiddenEggPanelOpened = true;
    },
    closeHiddenEggPanel() {
      // this.store.commit("setUpdateBrowserSelfValue", true);
      this.isHiddenEggPanelOpened = false;
    },
    // hiddenEggPanelOnClick(e: Event) {
    //   e.stopPropagation();
    // },
    cvBoxResize(widthAndHeight: any) {
      const myself = this;

      let justifyContent = "center";
      if (widthAndHeight.width < parseInt(myself.cvBoxStyle.width!, 10)) {
        justifyContent = "flex-start";
      }
      // console.log("width", widthAndHeight.width, "document.body.clientWidth", document.body.clientWidth);

      myself.cvBoxParentStyle.justifyContent = justifyContent;
    },
    resetRootScale() {
      const myself = this;
      myself.rootScale = myself.store.state.uiCalculation.rootScale;
    }
  }
});

// defineExpose({
//   vueData
// });
</script>

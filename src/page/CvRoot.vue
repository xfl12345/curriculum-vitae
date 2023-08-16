<template>
  <div
    ref="templateRoot"
    v-resize="cvBoxResize"
    style="display: flex; justify-content: flex-start; position: relative"
    :style="rootNodeStyle"
  >
    <div v-if="isCvDataLoaded" style="display: flex; width: 100%; height: 100%" :style="cvBoxParentStyle">
      <div
        ref="cvBox"
        style="box-sizing: border-box; vertical-align: top"
        :style="[cvBoxStyle, { border: debugCvBoxSize ? '1px dashed aqua' : undefined }]"
      >
        <div
          ref="cvBoxBody"
          style="box-sizing: border-box; display: inline-block"
          :style="{ border: debugCvBoxSize ? '1px dashed hotpink' : undefined }"
        >
          <!--基本信息-->
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
          <!--交个朋友-->
          <cv-chapter
            :the-font-size-in-pixel="theFontSizeInPixel"
            :the-title="t('word.xfl_title_community')"
            the-slogan="Talk is cheap,show me the code!"
          >
            <community-box v-bind="cvData.community" :the-font-size-in-pixel="theFontSizeInPixel" />
          </cv-chapter>
          <!--履历-->
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
          <!--技能证书-->
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
          <!--技能水平-->
          <cv-chapter
            v-if="'skillDegree' in cvData"
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
          <!--折腾碎念-->
          <cv-chapter
            v-if="'interestingBlog' in cvData"
            :the-font-size-in-pixel="theFontSizeInPixel"
            :the-title="t('word.xfl_title_blog')"
          >
            <div :style="{ fontSize: theFontSize }">
              <ul style="margin: 0" :style="{ padding: '0 ' + theFontSize }">
                <li v-for="item in cvData.interestingBlog" :key="item.id">
                  <text-prettier :content="item.content" />
                </li>
              </ul>
            </div>
          </cv-chapter>
          <!--自我评价-->
          <cv-chapter
            v-if="'selfAppraisal' in cvData"
            :the-font-size-in-pixel="theFontSizeInPixel"
            :the-title="t('word.xfl_title_self_appraisal')"
          >
            <text-prettier :style="{ fontSize: theFontSize }" :content="cvData.selfAppraisal" />
          </cv-chapter>
          <vue3-mounted-helper @mounted="onCvBoxMounted" />
        </div>
      </div>
    </div>
    <hidden-egg-panel
      v-model:is-panel-opened="isHiddenEggPanelOpened"
      v-model:root-scale="rootScale"
      @jump2-index-page="jump2IndexPage"
      @reset-root-scale="resetRootScale"
    />
    <load-cv-data-failed-message-box
      v-if="isLoadCvDataFailed"
      :the-font-size-in-pixel="store.getters.theFontSize"
      :message="loadCvDataFailedMessage"
      @jump2-login-page="jump2LoginPage"
      @refresh-cv-data="refreshCvData"
    />
  </div>
</template>

<script lang="tsx">
import { defineComponent, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useStore } from "vuex";
import { useRouter } from "vue-router";
import { v1 as uuidv1 } from "uuid";
import { paperA4Standard } from "@/assets/json/common.json";
import TextPrettier from "@/components/xfl-common/vue/TextPrettier.vue";
import { TripleItemLog } from "@/components/xfl-common/ts/TripleItemLog";
import { PaperSizeStandard } from "@/components/xfl-common/ts/PaperSizeStandard";
import { PartialCssStyleType } from "@/components/xfl-common/ts/PartialCssStyleType";
import { CurriculumVitaeData } from "@/tsmod/CurriculumVitaeData";
import { getCurriculumVitaeData } from "@/model/SecretDataApi";
import CvChapter from "@/components/CvChapter.vue";
import RecordItem from "@/components/RecordItem.vue";
import CommunityBox from "@/components/CommunityBox.vue";
import HiddenEggPanel from "@/components/HiddenEggPanel.vue";
import BasicInfoGlance from "@/components/BasicInfoGlance.vue";
import PersonalAbility from "@/components/PersonalAbility.vue";
import Vue3MountedHelper from "@/components/xfl-common/vue/Vue3MountedHelper.vue";
import LoadCvDataFailedMessageBox from "@/components/LoadCvDataFailedMessageBox.vue";

export default defineComponent({
  components: {
    LoadCvDataFailedMessageBox,
    Vue3MountedHelper,
    HiddenEggPanel,
    BasicInfoGlance,
    CommunityBox,
    CvChapter,
    PersonalAbility,
    RecordItem,
    TextPrettier
  },
  setup() {
    const { t } = useI18n();
    const store = useStore();
    const router = useRouter();

    const templateRoot = ref<HTMLDivElement>();
    const cvBox = ref<HTMLDivElement>();
    const cvBoxBody = ref<HTMLDivElement>();
    const loadCvDataFailedMessageBox = ref<HTMLDivElement>();
    const paperSizeStandard: PaperSizeStandard = paperA4Standard.sizeInMillimetre as PaperSizeStandard;

    return {
      templateRoot,
      t,
      store,
      router,
      cvBox,
      cvBoxBody,
      loadCvDataFailedMessageBox,
      paperSizeStandard
    };
  },
  data() {
    const myself = this;
    const rootNodeStyle: PartialCssStyleType = {};
    const cvBoxParentStyle: PartialCssStyleType = {};
    const cvData: Partial<CurriculumVitaeData> = {};
    return {
      debugCvBoxSize: false,
      rootNodeStyle,
      cvBoxParentStyle,
      isReloadingCvData: false,
      isHiddenEggPanelOpened: false,
      isLoadCvDataFailed: false,
      cvData,
      rootScale: 7,
      cvBoxMounted: false,
      adjustingFontSize: "",
      theFontSizeInPixel: 36,
      loadCvDataFailedMessage: ""
    };
  },
  computed: {
    isCvDataLoaded() {
      return "basicInformation" in this.cvData;
    },
    theFontSize() {
      return this.theFontSizeInPixel + "px";
    },
    cvBoxHeightInPixel() {
      return this.paperSizeStandard.height * this.rootScale;
    },
    cvBoxStyle(): PartialCssStyleType {
      const myself = this;
      const width = myself.paperSizeStandard.width * myself.rootScale + "px";
      const height = myself.cvBoxHeightInPixel + "px";

      return {
        minWidth: width,
        width,
        height
      };
    }
  },
  watch: {
    rootScale(newValue, oldValue) {
      if (newValue !== oldValue) {
        console.log("rootScale: " + newValue);
        this.adjustFontSize();
      }
    }
  },
  created() {
    const myself = this;
    myself.rootScale = myself.store.state.uiCalculation.rootScale;
  },
  beforeMount() {
    const myself = this;
    myself.store.state.loginManager.isAlreadyLogin().then((result: boolean) => {
      if (!result) {
        myself.jump2LoginPage(); // 没登录
      } else if (!myself.isCvDataLoaded) {
        myself.refreshCvData(); // 没缓存
      }
    });
  },
  mounted() {
    const myself = this;
  },
  unmounted() {
    const myself = this;
  },
  methods: {
    openUrl(url: string) {
      window.open(url);
    },
    jump2LoginPage() {
      this.router.push({ name: "login" });
    },
    jump2IndexPage() {
      this.router.push({ name: "index" });
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
    cvBoxResize(widthAndHeight: any) {
      const myself = this;

      let justifyContent = "center";
      if (widthAndHeight.width < parseInt(myself.cvBoxStyle.width! as string, 10)) {
        justifyContent = "flex-start";
      }

      myself.cvBoxParentStyle.justifyContent = justifyContent;
    },
    resetRootScale() {
      const myself = this;
      myself.rootScale = myself.store.state.uiCalculation.rootScale;
    },
    onCvBoxMounted() {
      this.cvBoxMounted = true;
      this.adjustFontSize();
    },
    adjustFontSize() {
      const myself = this;

      if (!myself.cvBoxMounted || myself.adjustingFontSize !== "") {
        return;
      }
      const myThreadId = uuidv1();
      myself.adjustingFontSize = myThreadId;
      if (myself.adjustingFontSize !== myThreadId) {
        return;
      }

      const cvBoxWidthInPixel = myself.paperSizeStandard.width * myself.rootScale;
      console.log("cvBoxWidthInPixel", cvBoxWidthInPixel);
      console.log("scrollWidth", myself.cvBoxBody.scrollWidth);
      console.log("current FontSize" + myself.theFontSize);

      const fontSizeLog = new TripleItemLog<number>();
      const getMaxFontSize = () => cvBoxWidthInPixel / 4;

      let maxFontSize = getMaxFontSize();
      let minFontSize = 8;
      const getMiddleFontSize = () => Math.round((minFontSize + maxFontSize) / 2);
      let currentFontSize = Math.round(
        cvBoxWidthInPixel / Math.round(myself.cvBoxBody.scrollWidth / myself.theFontSizeInPixel)
      );
      myself.theFontSizeInPixel = currentFontSize;
      fontSizeLog.push(currentFontSize);
      const ptrBook: any = {
        vertical: {
          done: false,
          adjustFunc: () => {}
        },
        horizontal: {
          done: false,
          adjustFunc: () => {}
        },
        onDomRefreshed: () => {}
      };

      console.log("minFontSize", minFontSize);
      console.log("maxFontSize", maxFontSize);

      ptrBook.horizontal.adjustFunc = () => {
        if (myself.cvBoxBody.scrollWidth > cvBoxWidthInPixel) {
          maxFontSize = currentFontSize;
          currentFontSize = getMiddleFontSize();
          myself.theFontSizeInPixel = currentFontSize;
          fontSizeLog.push(currentFontSize);
        } else if (myself.cvBoxBody.scrollWidth <= cvBoxWidthInPixel) {
          const gap = Math.abs(
            Math.ceil(myself.cvBoxBody.scrollWidth / myself.theFontSizeInPixel) -
              Math.ceil(cvBoxWidthInPixel / myself.theFontSizeInPixel)
          );
          if (gap > 2) {
            maxFontSize = getMaxFontSize();
          }

          minFontSize = currentFontSize;
          currentFontSize = getMiddleFontSize();
          myself.theFontSizeInPixel = currentFontSize;
          fontSizeLog.push(currentFontSize);
        } else {
          ptrBook.horizontal.done = true;
          console.log("Horizontal adjustment done!");
        }
      };
      ptrBook.onDomRefreshed = () => {
        if (!ptrBook.horizontal.done) {
          console.log("scrollWidth", myself.cvBoxBody.scrollWidth);
          // 如果实在探不到 盒子拉伸宽度 和 限制宽度 相等的 系数，那就给个极限退出循环
          if (fontSizeLog.getSize() > 2 && fontSizeLog.getFirst() === fontSizeLog.getLast()) {
            if (myself.cvBoxBody.scrollWidth > cvBoxWidthInPixel) {
              myself.theFontSizeInPixel -= 1;
            }
            console.log("Signing done...");
            ptrBook.horizontal.done = true;
            ptrBook.onDomRefreshed();
          } else {
            ptrBook.horizontal.adjustFunc();
            myself.$nextTick(() => setTimeout(ptrBook.onDomRefreshed, 4));
          }
        } else {
          ptrBook.onDomRefreshed = () => {};
          console.log("adjustFontSize done.");
          setTimeout(() => {
            console.log("cvBoxWidthInPixel", cvBoxWidthInPixel);
            console.log("scrollWidth", myself.cvBoxBody.scrollWidth);
            console.log("Final FontSize", myself.theFontSize);
            console.log(
              "current maxLine",
              Math.ceil(myself.cvBoxBody.scrollHeight / myself.theFontSizeInPixel)
            );
            console.log("target maxLine", Math.ceil(myself.cvBoxHeightInPixel / myself.theFontSizeInPixel));
            myself.adjustingFontSize = "";
          }, 20);
        }
      };
      ptrBook.onDomRefreshed();
    }
  }
});
</script>

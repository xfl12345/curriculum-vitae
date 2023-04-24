<template>
  <div ref="templateRoot">
    <div style="box-sizing: border-box; display: inline-block">
      <div style="display: inline-block">
        <div>默认字体</div>
        <div style="border: 1px solid aqua">
          <canvas ref="defaultFontCanvas" :height="canvasWidthInPixel" :width="canvasWidthInPixel" />
        </div>
      </div>
      <span>&nbsp;</span>
      <div style="display: inline-block">
        <div>选中字体</div>
        <div style="border: 1px solid aqua">
          <canvas ref="selectedFontCanvas" :height="canvasWidthInPixel" :width="canvasWidthInPixel" />
        </div>
      </div>
    </div>
    <div>
      <span>当前浏览器默认字体：{{ currentDefaultFont }}</span>
      <br />
      <br />
      <span>字体平台：</span>
      <select v-model="selectedFontPlatformName">
        <option v-for="item in Object.keys(dataFont)" :key="item">{{ item }}</option>
      </select>
      <br />
      <br />
      <span>字体：</span>
      <select v-model="selectedFont">
        <option v-for="item in fontList" :key="item.en" :value="item">
          {{ item.ch }}
        </option>
      </select>
      <br />
      <br />
      <span>字体英文名：{{ selectedFont ? selectedFont.en + "" : "" }}</span>
      <br />
      <br />
      <div>数据量：{{ canvasWidthInPixel * canvasWidthInPixel }} 个像素</div>
      <span>浏览器是否支持选中字体：</span>
      <div v-if="selectedFont">
        <bench-mark-result ref="algorithmA" v-bind="benchMarkResult.algorithmA" /><br />
        <bench-mark-result ref="algorithmB" v-bind="benchMarkResult.algorithmB" />
      </div>
    </div>
    <bench-mark-result
      algorithm-name="奇怪的算法"
      :is-supported="false"
      :elapsed-time-in-microseconds="250"
    />
  </div>
</template>

<script lang="tsx">
import { defineComponent, ref, h } from "vue";
import { parseFontFamilyAndGetTheFirstOne } from "../components/xfl-common/ts/CssFontParser";

// source code URL
// https://www.cnblogs.com/gaidalou/p/8479452.html
// https://www.freesion.com/article/6257143748/
// https://www.zhangxinxu.com/wordpress/2018/02/js-detect-suppot-font-family/

// eslint-disable-next-line vue/one-component-per-file
const BenchMarkResult = defineComponent({
  name: "BenchMarkResult",
  props: {
    algorithmName: {
      type: String,
      default: "algorithm"
    },
    pending: {
      type: Boolean,
      default: false
    },
    isError: {
      type: Boolean,
      default: true
    },
    isSupported: {
      type: Boolean,
      default: false
    },
    elapsedTimeInMicroseconds: {
      type: Number,
      default: 0
    }
    // isDifferentArray: {
    //   type: Function,
    //   default: (aaList: Uint8ClampedArray, bbList: Uint8ClampedArray) => {
    //     if (aaList.length !== bbList.length) {
    //       return true;
    //     }
    //     for (let i = 0; i < aaList.length; i += 1) {
    //       if (aaList[i] !== bbList[i]) {
    //         return true;
    //       }
    //     }
    //     return false;
    //   }
    // }
  },
  render() {
    const myself = this;
    const coloOfSupported = myself.isSupported ? "darkgreen" : "red";
    const colorOfError = myself.isError ? "red" : "darkgreen";
    return (
      <div style='display: inline-block'>
        [{myself.algorithmName}] error: <span style={"color:" + colorOfError}>{myself.isError + ""}</span> ,
        result: <span style={"color:" + coloOfSupported}>{myself.isSupported + ""}</span> , elapsed time:{" "}
        <span style='color: blue'>{myself.elapsedTimeInMicroseconds}ms</span>
      </div>
    );
  }
});

// eslint-disable-next-line vue/one-component-per-file
export default defineComponent({
  components: {
    BenchMarkResult
  },
  props: {},
  setup(props, ctx) {
    const templateRoot = ref<HTMLDivElement>();
    const defaultFontCanvas = ref<HTMLCanvasElement>();
    const selectedFontCanvas = ref<HTMLCanvasElement>();
    const algorithmA = ref<InstanceType<typeof BenchMarkResult>>();
    const algorithmB = ref<InstanceType<typeof BenchMarkResult>>();

    return {
      templateRoot,
      defaultFontCanvas,
      selectedFontCanvas,
      algorithmA,
      algorithmB
    };
  },
  data() {
    const dataFont: any = {
      windows: [
        {
          ch: "宋体",
          en: "SimSun"
        },
        {
          ch: "黑体",
          en: "SimHei"
        },
        {
          ch: "微软雅黑",
          en: "Microsoft Yahei"
        },
        {
          ch: "微软正黑体",
          en: "Microsoft JhengHei"
        },
        {
          ch: "楷体",
          en: "KaiTi"
        },
        {
          ch: "新宋体",
          en: "NSimSun"
        },
        {
          ch: "仿宋",
          en: "FangSong"
        }
      ],
      "OS X": [
        {
          ch: "苹方",
          en: "PingFang SC"
        },
        {
          ch: "华文黑体",
          en: "STHeiti"
        },
        {
          ch: "华文楷体",
          en: "STKaiti"
        },
        {
          ch: "华文宋体",
          en: "STSong"
        },
        {
          ch: "华文仿宋",
          en: "STFangsong"
        },
        {
          ch: "华文中宋",
          en: "STZhongsong"
        },
        {
          ch: "华文琥珀",
          en: "STHupo"
        },
        {
          ch: "华文新魏",
          en: "STXinwei"
        },
        {
          ch: "华文隶书",
          en: "STLiti"
        },
        {
          ch: "华文行楷",
          en: "STXingkai"
        },
        {
          ch: "冬青黑体简",
          en: "Hiragino Sans GB"
        },
        {
          ch: "兰亭黑-简",
          en: "Lantinghei SC"
        },
        {
          ch: "翩翩体-简",
          en: "Hanzipen SC"
        },
        {
          ch: "手札体-简",
          en: "Hannotate SC"
        },
        {
          ch: "宋体-简",
          en: "Songti SC"
        },
        {
          ch: "娃娃体-简",
          en: "Wawati SC"
        },
        {
          ch: "魏碑-简",
          en: "Weibei SC"
        },
        {
          ch: "行楷-简",
          en: "Xingkai SC"
        },
        {
          ch: "雅痞-简",
          en: "Yapi SC"
        },
        {
          ch: "圆体-简",
          en: "Yuanti SC"
        }
      ],
      office: [
        {
          ch: "幼圆",
          en: "YouYuan"
        },
        {
          ch: "隶书",
          en: "LiSu"
        },
        {
          ch: "华文细黑",
          en: "STXihei"
        },
        {
          ch: "华文楷体",
          en: "STKaiti"
        },
        {
          ch: "华文宋体",
          en: "STSong"
        },
        {
          ch: "华文仿宋",
          en: "STFangsong"
        },
        {
          ch: "华文中宋",
          en: "STZhongsong"
        },
        {
          ch: "华文彩云",
          en: "STCaiyun"
        },
        {
          ch: "华文琥珀",
          en: "STHupo"
        },
        {
          ch: "华文新魏",
          en: "STXinwei"
        },
        {
          ch: "华文隶书",
          en: "STLiti"
        },
        {
          ch: "华文行楷",
          en: "STXingkai"
        },
        {
          ch: "方正舒体",
          en: "FZShuTi"
        },
        {
          ch: "方正姚体",
          en: "FZYaoti"
        }
      ],
      open: [
        {
          ch: "思源黑体",
          en: "Source Han Sans CN"
        },
        {
          ch: "思源宋体",
          en: "Source Han Serif SC"
        },
        {
          ch: "文泉驿微米黑",
          en: "WenQuanYi Micro Hei"
        }
      ],
      hanyi: [
        {
          ch: "汉仪旗黑",
          en: "HYQihei 40S"
        },
        {
          ch: "汉仪旗黑",
          en: "HYQihei 50S"
        },
        {
          ch: "汉仪旗黑",
          en: "HYQihei 60S"
        },
        {
          ch: "汉仪大宋简",
          en: "HYDaSongJ"
        },
        {
          ch: "汉仪楷体",
          en: "HYKaiti"
        },
        {
          ch: "汉仪家书简",
          en: "HYJiaShuJ"
        },
        {
          ch: "汉仪PP体简",
          en: "HYPPTiJ"
        },
        {
          ch: "汉仪乐喵体简",
          en: "HYLeMiaoTi"
        },
        {
          ch: "汉仪小麦体",
          en: "HYXiaoMaiTiJ"
        },
        {
          ch: "汉仪程行体",
          en: "HYChengXingJ"
        },
        {
          ch: "汉仪黑荔枝",
          en: "HYHeiLiZhiTiJ"
        },
        {
          ch: "汉仪雅酷黑W",
          en: "HYYaKuHeiW"
        },
        {
          ch: "汉仪大黑简",
          en: "HYDaHeiJ"
        },
        {
          ch: "汉仪尚魏手书W",
          en: "HYShangWeiShouShuW"
        }
      ],
      fangzheng: [
        {
          ch: "方正粗雅宋简体",
          en: "FZYaSongS-B-GB"
        },
        {
          ch: "方正报宋简体",
          en: "FZBaoSong-Z04S"
        },
        {
          ch: "方正粗圆简体",
          en: "FZCuYuan-M03S"
        },
        {
          ch: "方正大标宋简体",
          en: "FZDaBiaoSong-B06S"
        },
        {
          ch: "方正大黑简体",
          en: "FZDaHei-B02S"
        },
        {
          ch: "方正仿宋简体",
          en: "FZFangSong-Z02S"
        },
        {
          ch: "方正黑体简体",
          en: "FZHei-B01S"
        },
        {
          ch: "方正琥珀简体",
          en: "FZHuPo-M04S"
        },
        {
          ch: "方正楷体简体",
          en: "FZKai-Z03S"
        },
        {
          ch: "方正隶变简体",
          en: "FZLiBian-S02S"
        },
        {
          ch: "方正隶书简体",
          en: "FZLiShu-S01S"
        },
        {
          ch: "方正美黑简体",
          en: "FZMeiHei-M07S"
        },
        {
          ch: "方正书宋简体",
          en: "FZShuSong-Z01S"
        },
        {
          ch: "方正舒体简体",
          en: "FZShuTi-S05S"
        },
        {
          ch: "方正水柱简体",
          en: "FZShuiZhu-M08S"
        },
        {
          ch: "方正宋黑简体",
          en: "FZSongHei-B07S"
        },
        {
          ch: "方正宋三简体",
          en: "FZSong"
        },
        {
          ch: "方正魏碑简体",
          en: "FZWeiBei-S03S"
        },
        {
          ch: "方正细等线简体",
          en: "FZXiDengXian-Z06S"
        },
        {
          ch: "方正细黑一简体",
          en: "FZXiHei I-Z08S"
        },
        {
          ch: "方正细圆简体",
          en: "FZXiYuan-M01S"
        },
        {
          ch: "方正小标宋简体",
          en: "FZXiaoBiaoSong-B05S"
        },
        {
          ch: "方正行楷简体",
          en: "FZXingKai-S04S"
        },
        {
          ch: "方正姚体简体",
          en: "FZYaoTi-M06S"
        },
        {
          ch: "方正中等线简体",
          en: "FZZhongDengXian-Z07S"
        },
        {
          ch: "方正准圆简体",
          en: "FZZhunYuan-M02S"
        },
        {
          ch: "方正综艺简体",
          en: "FZZongYi-M05S"
        },
        {
          ch: "方正彩云简体",
          en: "FZCaiYun-M09S"
        },
        {
          ch: "方正隶二简体",
          en: "FZLiShu II-S06S"
        },
        {
          ch: "方正康体简体",
          en: "FZKangTi-S07S"
        },
        {
          ch: "方正超粗黑简体",
          en: "FZChaoCuHei-M10S"
        },
        {
          ch: "方正新报宋简体",
          en: "FZNew BaoSong-Z12S"
        },
        {
          ch: "方正新舒体简体",
          en: "FZNew ShuTi-S08S"
        },
        {
          ch: "方正黄草简体",
          en: "FZHuangCao-S09S"
        },
        {
          ch: "方正少儿简体",
          en: "FZShaoEr-M11S"
        },
        {
          ch: "方正稚艺简体",
          en: "FZZhiYi-M12S"
        },
        {
          ch: "方正细珊瑚简体",
          en: "FZXiShanHu-M13S"
        },
        {
          ch: "方正粗宋简体",
          en: "FZCuSong-B09S"
        },
        {
          ch: "方正平和简体",
          en: "FZPingHe-S11S"
        },
        {
          ch: "方正华隶简体",
          en: "FZHuaLi-M14S"
        },
        {
          ch: "方正瘦金书简体",
          en: "FZShouJinShu-S10S"
        },
        {
          ch: "方正细倩简体",
          en: "FZXiQian-M15S"
        },
        {
          ch: "方正中倩简体",
          en: "FZZhongQian-M16S"
        },
        {
          ch: "方正粗倩简体",
          en: "FZCuQian-M17S"
        },
        {
          ch: "方正胖娃简体",
          en: "FZPangWa-M18S"
        },
        {
          ch: "方正宋一简体",
          en: "FZSongYi-Z13S"
        },
        {
          ch: "方正剪纸简体",
          en: "FZJianZhi-M23S"
        },
        {
          ch: "方正流行体简体",
          en: "FZLiuXingTi-M26S"
        },
        {
          ch: "方正祥隶简体",
          en: "FZXiangLi-S17S"
        },
        {
          ch: "方正粗活意简体",
          en: "FZCuHuoYi-M25S"
        },
        {
          ch: "方正胖头鱼简体",
          en: "FZPangTouYu-M24S"
        },
        /* {"ch":"方正铁筋隶书简体","en":"FZTieJinLiShu-Z14S"},{"ch":"方正北魏楷书简体","en":"FZBeiWeiKaiShu-Z15S"}, */ {
          ch: "方正卡通简体",
          en: "FZKaTong-M19S"
        },
        {
          ch: "方正艺黑简体",
          en: "FZYiHei-M20S"
        },
        {
          ch: "方正水黑简体",
          en: "FZShuiHei-M21S"
        },
        {
          ch: "方正古隶简体",
          en: "FZGuLi-S12S"
        },
        {
          ch: "方正幼线简体",
          en: "FZYouXian-Z09S"
        },
        {
          ch: "方正启体简体",
          en: "FZQiTi-S14S"
        },
        {
          ch: "方正小篆体",
          en: "FZXiaoZhuanTi-S13T"
        },
        {
          ch: "方正硬笔楷书简体",
          en: "FZYingBiKaiShu-S15S"
        },
        {
          ch: "方正毡笔黑简体",
          en: "FZZhanBiHei-M22S"
        },
        {
          ch: "方正硬笔行书简体",
          en: "FZYingBiXingShu-S16S"
        }
      ]
    };
    const currentDefaultFont = parseFontFamilyAndGetTheFirstOne(
      window.getComputedStyle(document.documentElement).fontFamily,
      "serif"
    );

    return {
      dataFont,
      currentDefaultFont,
      canvasWidthInPixel: 900,
      selectedFontPlatformName: "",
      fontList: [],
      selectedFont: undefined,
      isSupported: false,
      benchMarkResult: {
        algorithmA: {
          algorithmName: "algorithmA",
          pending: false,
          isSupported: false,
          elapsedTimeInMicroseconds: 0
        },
        algorithmB: {
          algorithmName: "algorithmB",
          pending: false,
          isSupported: false,
          elapsedTimeInMicroseconds: 0
        }
      }
    };
  },
  computed: {},
  watch: {
    selectedFontPlatformName(newValue, oldValue) {
      if (newValue !== oldValue) {
        const myself = this;
        myself.fontList = myself.dataFont[myself.selectedFontPlatformName];
        myself.selectedFont = myself.fontList[0];
      }
    },
    selectedFont(newValue, oldValue) {
      if (newValue !== oldValue) {
        console.log(newValue.en);
        const myself = this;
        myself.isSupportedFontFamily(newValue.en);
      }
    }
  },
  beforeCreate() {},
  created() {},
  beforeMount() {},
  mounted() {
    const myself = this;

    if (myself.selectedFontPlatformName === "") {
      myself.selectedFontPlatformName = Object.keys(myself.dataFont)[0];
    }
  },
  beforeUpdate() {},
  updated() {},
  activated() {},
  deactivated() {},
  beforeUnmount() {},
  unmounted() {},
  methods: {
    isDifferentArray(aaList: number[], bbList: number[]): boolean {
      if (aaList.length !== bbList.length) {
        // console.log("666");
        return true;
      }

      const isDifferent = (a: number | undefined, b: number | undefined): boolean => {
        if (typeof a === "undefined" || typeof b === "undefined") {
          return true;
        }

        return a !== b;
      };

      const sliceMin = 16;
      let status = [];
      let statusTmp = [];
      let count = 0;

      status.push({ L: 0, R: aaList.length - 1 });
      while (count < aaList.length) {
        const currentStatusArrayLength = status.length;
        for (let i = 0; i < currentStatusArrayLength; i += 1) {
          const item = status[i] as any;
          let isEndOfLife = false;
          if (isDifferent(aaList[item.L], bbList[item.L]) || isDifferent(aaList[item.R], bbList[item.R])) {
            // console.log("a=" + item.L + ",b=" + item.R);
            return true;
          }
          if (item.L + 1 < item.R) {
            count += 2;
            item.L += 1;
            item.R -= 1;
            // 是否达到二分阈值？假如区间（不包括自己）仍至少有 二分阈值 个元素，那么便二分
            if (item.L + sliceMin < item.R) {
              const total = (item.L + item.R) as number;
              // const mid = Math.floor((item.L + item.R) / 2);
              const mid = (total & 0x1) === 1 ? (total - 1) >> 1 : total >> 1;
              statusTmp.push({ L: mid + 1, R: item.R });
              item.R = mid;
            }
          } else if (item.L + 1 === item.R) {
            count += 2;
          } else {
            count += 1;
            isEndOfLife = true;
          }
          if (!isEndOfLife) {
            statusTmp.push(status[i]);
          }
        }

        status = statusTmp;
        statusTmp = [];
      }

      // console.log(777);
      return false;
    },
    isDifferentArrayInternetOrigin(aaList: number[], bbList: number[]) {
      const toString = (theList: number[]) =>
        [].slice
          .call(theList)
          .filter((l) => l !== 0)
          .join("");
      return toString(aaList) !== toString(bbList);
    },
    isSupportedFontFamily(fontName: string) {
      const myself = this;
      // h是基础字体
      // const defaultFontName = "Arial";
      const defaultFontName = myself.currentDefaultFont;
      if (fontName.toLowerCase() === defaultFontName.toLowerCase()) {
        myself.benchMarkResult.algorithmA.isSupported = true;
        myself.benchMarkResult.algorithmA.elapsedTimeInMicroseconds = 0;
        myself.benchMarkResult.algorithmB.isSupported = true;
        myself.benchMarkResult.algorithmB.elapsedTimeInMicroseconds = 0;
        return true;
      }
      const defaultFontCanvas = this.defaultFontCanvas as HTMLCanvasElement;
      const selectedFontCanvas = this.selectedFontCanvas as HTMLCanvasElement;
      //    设置一个检测的字符A,看他是否支持f字体
      const testChar = "a";

      const defaultFontImage = myself.renderFontChar(
        defaultFontName,
        defaultFontName,
        testChar,
        defaultFontCanvas
      );
      const customFontImage = myself.renderFontChar(
        fontName,
        defaultFontName,
        testChar,
        selectedFontCanvas
      );

      myself
        .benchMark(
          () => myself.isDifferentArray(defaultFontImage, customFontImage),
          myself.benchMarkResult.algorithmA
        )
        .then(() =>
          myself.benchMark(
            () => myself.isDifferentArrayInternetOrigin(defaultFontImage, customFontImage),
            myself.benchMarkResult.algorithmB
          )
        );
    },
    renderFontChar(
      fontName: string,
      defaultFontName: string,
      testChar: string,
      canvas: HTMLCanvasElement
    ): number[] {
      const canvasContext = canvas.getContext("2d", {
        alpha: true,
        willReadFrequently: true
      }) as CanvasRenderingContext2D;
      const width = canvas.width;
      const height = canvas.height;
      const fontSize = width;
      canvasContext.clearRect(0, 0, width, height);
      canvasContext.textAlign = "center";
      canvasContext.fillStyle = "black";
      canvasContext.textBaseline = "middle";
      // 字体是传入的j,或者是默认的h
      canvasContext.font = fontSize + "px " + fontName + ", " + defaultFontName;
      canvasContext.fillText(testChar, width / 2, height / 2);
      return [...canvasContext.getImageData(0, 0, width, height).data];
      // return new Uint8Array(canvasContext.getImageData(0, 0, width, height).data);
      // return canvasContext.getImageData(0, 0, width, height).data;
    },
    benchMark(testFunc: Function, resultOutput: any) {
      resultOutput.pending = true;
      resultOutput.isError = false;
      const startTime = new Date().getTime();
      return new Promise((resolve) => {
        resolve(testFunc());
      }).then(
        (value) => {
          const endTime = new Date().getTime();
          resultOutput.pending = false;
          resultOutput.isSupported = value;
          // console.log("startTime", startTime, "endTime", endTime);
          resultOutput.elapsedTimeInMicroseconds = endTime - startTime;

          return new Promise((resolve) => {
            resolve(true);
          });
        },
        () => {
          const endTime = new Date().getTime();
          resultOutput.isError = true;
          resultOutput.isSupported = false;
          resultOutput.elapsedTimeInMicroseconds = endTime - startTime;
          return new Promise((resolve) => {
            resolve(false);
          });
        }
      );
    }
  }
});
</script>

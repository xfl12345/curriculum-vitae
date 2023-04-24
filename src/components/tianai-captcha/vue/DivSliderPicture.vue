<template>
  <div
    ref="templateRoot"
    style="display: flex; justify-content: space-between"
    :style="{ width: boxWidth, height: boxHeight }"
  >
    <!-- 左三角 -->
    <div-triangle-picture
      direction="left"
      :triangle-height-in-pixel="boxHeightInPixel / 2"
      :box-shadow-blur="shadowBlur"
      :box-shadow-spread="shadowSpread"
      :box-shadow-color="shadowColor"
    />
    <!--中心小圆点-->
    <div style="height: 100%; display: flex; flex-direction: column; justify-content: center">
      <div
        style="border-radius: 100%"
        :style="[
          cssStyle,
          {
            width: peerPictureWidth,
            height: peerPictureWidth,
            backgroundColor: color
          }
        ]"
      />
    </div>
    <!--右三角-->
    <div-triangle-picture
      direction="right"
      :triangle-height-in-pixel="boxHeightInPixel / 2"
      :box-shadow-blur="shadowBlur"
      :box-shadow-spread="shadowSpread"
      :box-shadow-color="shadowColor"
    />
  </div>
</template>

<script lang="tsx">
import { defineComponent, PropType, ref } from "vue";
import { cssMixer } from "../../xfl-common/ts/CssMixer";
import DivTrianglePicture from "./DivTrianglePicture.vue";

const defaultCssStyle: Partial<CSSStyleDeclaration> = {};

export default defineComponent({
  components: { DivTrianglePicture },
  props: {
    boxHeightInPixel: {
      type: Number,
      default: 22
    },
    deepInPixel: {
      type: Number,
      default: -1
    },
    // useDefaultShadowStyle: {
    //   type: Boolean,
    //   default: true
    // },
    color: {
      type: String,
      default: "#03DE00"
    },
    propsCssStyle: {
      type: Object as PropType<Partial<CSSStyleDeclaration>>,
      default: (): Partial<CSSStyleDeclaration> => defaultCssStyle
    }
  },
  emits: [],
  setup(props, ctx) {
    const templateRoot = ref<HTMLDivElement>();

    return {
      templateRoot
    };
  },
  data() {
    return {};
  },
  computed: {
    boxWidthInPixel() {
      const myself = this;
      // return Math.ceil(((myself.boxHeightInPixel * 0.618) / (1 - 0.618)) * 2) + 2 * myself.boxHeightInPixel;
      return Math.floor(2 * myself.boxHeightInPixel);
    },
    boxWidth() {
      return this.boxWidthInPixel + "px";
    },
    boxHeight() {
      return this.boxHeightInPixel + "px";
    },
    peerPictureWidthInPixel() {
      const myself = this;
      return myself.boxHeightInPixel / 2;
    },
    peerPictureWidth() {
      return this.peerPictureWidthInPixel + "px";
    },
    shadowBlur() {
      return this.peerPictureWidthInPixel / 4;
    },
    shadowColor() {
      return "#999999";
    },
    shadowSpread() {
      const myself = this;
      const deep =
        myself.deepInPixel < 0 ? myself.peerPictureWidthInPixel * (1 - 0.618) : myself.deepInPixel;
      // 黄金等腰三角形，凹槽深度做高，取底边的一半
      return deep / Math.tan((72 / 180) * Math.PI);
    },
    shadowStyle() {
      const myself = this;
      // return "0 0 " + spreadWidth * 1.618 + "px " + spreadWidth + "px #999999 inset";
      // return (
      //   "0 0 " + myself.shadowBlur + "px " + myself.shadowSpread + "px " + myself.shadowColor + " inset"
      // );
      return `0 0 ${myself.shadowBlur}px ${myself.shadowSpread}px ${myself.shadowColor}  inset`;
    },
    cssStyle(): Partial<CSSStyleDeclaration> {
      const myself = this;
      const theStyle: Partial<CSSStyleDeclaration> = cssMixer(defaultCssStyle, myself.propsCssStyle);
      theStyle.boxShadow = myself.shadowStyle;
      return theStyle;
    },
    leftTrianglePicture(): Partial<CSSStyleDeclaration> {
      return this.triangleBorderCssStyleGenerator("right");
    },
    rightTrianglePicture(): Partial<CSSStyleDeclaration> {
      return this.triangleBorderCssStyleGenerator("left");
    }
  },
  watch: {},
  beforeCreate() {},
  created() {},
  beforeMount() {},
  mounted() {},
  beforeUpdate() {},
  updated() {},
  activated() {},
  deactivated() {},
  beforeUnmount() {},
  unmounted() {},
  methods: {
    triangleBorderCssStyleGenerator(direction: string): Partial<CSSStyleDeclaration> {
      const myself = this;

      const defaultStyleString = myself.peerPictureWidth + " solid transparent";
      const fullWidthStyleString = myself.peerPictureWidth + " solid " + myself.color;
      const zeroWidthStyleString = "0 solid " + myself.color;
      const theStyle: Partial<CSSStyleDeclaration> = {
        borderRight: defaultStyleString,
        borderBottom: defaultStyleString,
        borderLeft: defaultStyleString,
        borderTop: defaultStyleString
      };

      switch (direction) {
        case "right": {
          theStyle.borderRight = fullWidthStyleString;
          theStyle.borderLeft = zeroWidthStyleString;
          break;
        }
        case "left": {
          theStyle.borderLeft = fullWidthStyleString;
          theStyle.borderRight = zeroWidthStyleString;
          break;
        }
        case "top": {
          theStyle.borderTop = fullWidthStyleString;
          theStyle.borderBottom = zeroWidthStyleString;
          break;
        }
        case "bottom": {
          theStyle.borderBottom = fullWidthStyleString;
          theStyle.borderTop = zeroWidthStyleString;
          break;
        }
        default:
          break;
      }

      return theStyle;
    }
  }
});
</script>

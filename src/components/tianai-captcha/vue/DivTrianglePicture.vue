<template>
  <div ref="templateRoot" style="position: relative; background-color: transparent" :style="rootBoxStyle">
    <div
      style="box-sizing: border-box; position: absolute"
      :style="[rotateBoxStyle, { backgroundColor: color }]"
    />
    <div style="box-sizing: border-box; position: absolute" :style="triangleBaseBorderHelperBoxStyle" />
  </div>
</template>

<script lang="tsx">
import { defineComponent, PropType, ref } from "vue";
import { EnumDirection } from "../ts/Direction";
import { PartialCssStyleType } from "../../xfl-common/ts/PartialCssStyleType";

export default defineComponent({
  components: {},
  props: {
    triangleHeightInPixel: {
      type: Number,
      default: 100
    },
    direction: {
      type: String as PropType<EnumDirection>,
      default: "left"
    },
    color: {
      type: String,
      default: "lawngreen"
    },
    // box-shadow: h-shadow v-shadow blur spread color inset(outset)；
    boxShadowHShadow: {
      type: Number,
      default: 0
    },
    boxShadowVShadow: {
      type: Number,
      default: 0
    },
    boxShadowBlur: {
      type: Number,
      default: 10
    },
    boxShadowSpread: {
      type: Number,
      default: 5
    },
    boxShadowColor: {
      type: String,
      default: "#999999"
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
    rotateBoxSize() {
      // 至少要比 triangleHeightInPixel * sqrt(2) 要大
      return this.triangleHeightInPixel * 1.5 + "px";
    },
    rotateBoxShadow() {
      const myself = this;
      // box-shadow: h-shadow v-shadow blur spread color inset(outset)；
      return [
        myself.boxShadowHShadow + "px",
        myself.boxShadowVShadow + "px",
        myself.boxShadowBlur + "px",
        myself.boxShadowSpread + "px",
        myself.boxShadowColor
      ].join(" ");
    },
    triangleHeight() {
      return this.triangleHeightInPixel + "px";
    },
    rootBoxStyle(): PartialCssStyleType {
      const myself = this;
      const theStyle: PartialCssStyleType = {};
      theStyle.clipPath = "inset(0)";
      switch (myself.direction) {
        case "right":
        case "left": {
          theStyle.width = myself.triangleHeight;
          theStyle.height = myself.triangleHeightInPixel * 2 + "px";
          break;
        }
        case "top":
        case "bottom": {
          theStyle.width = myself.triangleHeightInPixel * 2 + "px";
          theStyle.height = myself.triangleHeight;
          break;
        }
        default:
          break;
      }

      return theStyle;
    },
    rotateBoxStyle(): PartialCssStyleType {
      const myself = this;
      const theStyle: PartialCssStyleType = {};
      theStyle.width = myself.rotateBoxSize;
      theStyle.height = myself.rotateBoxSize;
      theStyle.boxShadow = myself.rotateBoxShadow + " inset";
      switch (myself.direction) {
        case "right": {
          theStyle.top = myself.triangleHeight;
          theStyle.right = "0";
          theStyle.transformOrigin = theStyle.width + " 0";
          theStyle.transform = "rotate(45deg)";
          break;
        }
        case "left": {
          theStyle.top = myself.triangleHeight;
          theStyle.left = "0";
          theStyle.transformOrigin = "0 0";
          theStyle.transform = "rotate(-45deg)";
          break;
        }
        case "top": {
          theStyle.top = "0";
          theStyle.left = myself.triangleHeight;
          theStyle.transformOrigin = "0 0";
          theStyle.transform = "rotate(45deg)";
          break;
        }
        case "bottom": {
          theStyle.top = myself.triangleHeight;
          theStyle.right = myself.triangleHeight;
          theStyle.transformOrigin = theStyle.width + " 0";
          theStyle.transform = "rotate(135deg)";
          break;
        }
        default:
          break;
      }

      return theStyle;
    },
    triangleBaseBorderHelperBoxStyle(): PartialCssStyleType {
      const myself = this;
      const theStyle: PartialCssStyleType = {};
      theStyle.boxShadow = myself.rotateBoxShadow;
      theStyle.borderRadius = Math.ceil(7 * 0.414 * myself.boxShadowBlur) + "px";
      const longEdge = myself.triangleHeightInPixel * 2 + "px";
      const shortEdge =
        8 *
          (myself.boxShadowBlur > myself.boxShadowSpread ? myself.boxShadowBlur : myself.boxShadowSpread) +
        "px";

      switch (myself.direction) {
        case "right": {
          theStyle.width = shortEdge;
          theStyle.height = longEdge;
          theStyle.top = "0";
          theStyle.left = "-" + theStyle.width;
          break;
        }
        case "left": {
          theStyle.width = shortEdge;
          theStyle.height = longEdge;
          theStyle.top = "0";
          theStyle.left = myself.triangleHeight;
          break;
        }
        case "top": {
          theStyle.width = longEdge;
          theStyle.height = shortEdge;
          theStyle.top = myself.triangleHeight;
          theStyle.left = "0";
          break;
        }
        case "bottom": {
          theStyle.width = longEdge;
          theStyle.height = shortEdge;
          theStyle.top = "-" + theStyle.height;
          theStyle.left = "0";
          break;
        }
        default:
          break;
      }

      return theStyle;
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
  methods: {}
});
</script>

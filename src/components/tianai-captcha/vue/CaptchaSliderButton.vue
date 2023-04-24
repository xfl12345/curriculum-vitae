<template>
  <div
    ref="templateRoot"
    style="box-sizing: border-box"
    :style="[
      {
        width: boxWidth,
        height: boxWidth,
        padding: enableShadow ? boxShadowSpreadWidthInPixel + 'px' : undefined
      }
    ]"
  >
    <!-- 圆圈边框 -->
    <div
      style="box-sizing: border-box; height: 100%; border-radius: 100%; overflow: hidden"
      :style="cssStyle"
    >
      <!-- 圆圈实体 -->
      <div
        style="position: relative; width: 100%; height: 100%; clip-path: circle(50%); cursor: pointer"
        @mousedown="buttonOnMouseDown"
        @mouseup="buttonOnMouseUp"
        @touchstart="buttonOnTouchStart"
        @touchend="buttonOnTouchEnd"
      >
        <!-- 使中心图标水平竖直方向都居中 -->
        <center-box>
          <!-- 中心图标 -->
          <slot>
            <div-vertical-equidistant-line
              v-if="isDisabled || !isMoving"
              :box-height-in-pixel="pictureHeightInPixel"
              :box-width-in-pixel="pictureHeightInPixel"
              :props-css-style="{ backgroundColor: centerIconFillColor }"
              :use-default-shadow-style="enableShadow"
            />
            <div-slider-picture
              v-if="!isDisabled && isMoving"
              :box-height-in-pixel="pictureHeightInPixel * 0.8"
              :color="centerIconFillColor"
            />
          </slot>
        </center-box>
        <!--遮罩实现屏蔽所有子元素的touchmove，可以防止滚动-->
        <div
          v-if="touchMovePreventDefault"
          style="
            /*box-sizing: border-box;*/
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: transparent;
            /*border-radius: 100%;*/
            /*overflow: hidden;*/
            /*clip-path: circle(100%);*/
          "
          @touchmove.prevent="(event) => {}"
        />
      </div>
    </div>
  </div>
</template>

<script lang="tsx">
import { defineComponent, PropType, ref } from "vue";
import DivVerticalEquidistantLine from "./DivVerticalEquidistantLine.vue";
import DivSliderPicture from "./DivSliderPicture.vue";
import { cssMixer } from "../../xfl-common/ts/CssMixer";
import CenterBox from "../../xfl-common/vue/CenterBox.vue";
import { EnumSizingType } from "../../xfl-common/ts/EnumSizingType";

const defaultCssStyle: Partial<CSSStyleDeclaration> = {
  backgroundColor: "white"
};

export default defineComponent({
  components: { CenterBox, DivSliderPicture, DivVerticalEquidistantLine },
  props: {
    // isMoving: {
    //   type: Boolean,
    //   default: false
    // },
    isDisabled: {
      type: Boolean,
      default: false
    },
    sizingType: {
      type: String as PropType<EnumSizingType>,
      default: "border"
    },
    domSquareBoxWidth: {
      type: Number,
      default: 56
    },
    deepInPixel: {
      type: Number,
      default: -1
    },
    propsRadiusInPixel: {
      type: Number,
      default: 56
    },
    // 因为 DivSliderPicture 暂不支持控制是否启用阴影，所以只好先强制默认开启
    // enableShadow: {
    //   type: Boolean,
    //   default: true
    // },
    centerIconFillColor: {
      type: String,
      default: "#03DE00"
    },
    propsCssStyle: {
      type: Object as PropType<Partial<CSSStyleDeclaration>>,
      default: (): Partial<CSSStyleDeclaration> => defaultCssStyle
    },
    touchMovePreventDefault: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    "buttonOnMouseDown",
    "buttonOnMouseUp",
    "buttonOnTouchStart",
    "buttonOnTouchEnd",
    "radiusChanged"
  ],
  setup(props, ctx) {
    const templateRoot = ref<HTMLDivElement>();

    return {
      templateRoot
    };
  },
  data() {
    return {
      isMoving: false,
      enableShadow: true
    };
  },
  computed: {
    boxWidthInPixel() {
      const myself = this;
      let result = 0;

      switch (myself.sizingType) {
        case "content": {
          result =
            myself.propsRadiusInPixel! * 2 +
            (myself.enableShadow ? myself.boxShadowSpreadWidthInPixel * 2 : 0);
          break;
        }
        case "border":
        default: {
          result = myself.domSquareBoxWidth;
          break;
        }
      }

      return result;
    },
    boxWidth() {
      return this.boxWidthInPixel + "px";
    },
    radiusInPixel() {
      const myself = this;
      let result = 0;

      switch (myself.sizingType) {
        case "content": {
          result = myself.propsRadiusInPixel;
          break;
        }
        case "border":
        default: {
          result =
            myself.boxWidthInPixel / 2 - (myself.enableShadow ? myself.boxShadowSpreadWidthInPixel : 0);
          break;
        }
      }

      return Math.floor(result);
    },
    radius() {
      return this.radiusInPixel + "px";
    },
    pictureHeightInPixel() {
      // return (this.radiusInPixel * 2) / 7;
      // 2除以7 约等于 292除以1024 ，292 / 1024 = 0.2861328125
      // return this.radiusInPixel * 0.2861328125;
      return this.radiusInPixel * 0.618;
      // return this.radiusInPixel * 0.75;
    },
    boxShadowSpreadWidthInPixel() {
      const myself = this;
      const deep = myself.deepInPixel < 0 ? myself.boxWidthInPixel * (1 - 0.618) : myself.deepInPixel;
      // 黄金等腰三角形，凹槽深度做高，取底边的一半
      return deep / Math.tan((72 / 180) * Math.PI);
    },
    shadowStyle() {
      return "0 0 " + this.boxShadowSpreadWidthInPixel + "px 0 #999999";
    },
    cssStyle(): Partial<CSSStyleDeclaration> {
      const myself = this;
      const theStyle: Partial<CSSStyleDeclaration> = cssMixer(defaultCssStyle, myself.propsCssStyle);
      if (myself.enableShadow) {
        theStyle.boxShadow = myself.shadowStyle;
      }

      return theStyle;
    }
  },
  watch: {
    radiusInPixel(newValue, oldValue) {
      if (newValue !== oldValue) {
        this.$emit("radiusChanged", newValue);
      }
    }
  },
  beforeCreate() {},
  created() {},
  beforeMount() {},
  mounted() {
    this.$emit("radiusChanged", this.radiusInPixel);
  },
  beforeUpdate() {},
  updated() {},
  activated() {},
  deactivated() {},
  beforeUnmount() {},
  unmounted() {},
  methods: {
    buttonOnMouseDown(event: MouseEvent) {
      this.isMoving = true;
      this.$emit("buttonOnMouseDown", event);
    },
    buttonOnMouseUp(event: MouseEvent) {
      this.isMoving = false;
      this.$emit("buttonOnMouseUp", event);
    },
    buttonOnTouchStart(event: TouchEvent) {
      this.isMoving = true;
      this.$emit("buttonOnTouchStart", event);
    },
    buttonOnTouchEnd(event: TouchEvent) {
      this.isMoving = false;
      this.$emit("buttonOnTouchEnd", event);
    }
  }
});
</script>

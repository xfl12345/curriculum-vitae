<template>
  <div
    ref="templateRoot"
    style="
      display: inline-block;
      vertical-align: middle;
      position: relative;
      overflow: hidden;
      /*border: 4px solid darkgreen;*/
      border-radius: 100%;
    "
    :style="{ borderRadius: boxWidth }"
  >
    <svg
      :width="boxWidthInPixel"
      :height="boxWidthInPixel"
      :viewBox="'0 0 ' + boxWidthInPixel + ' ' + boxWidthInPixel"
    >
      <circle
        style="fill: transparent; stroke: #eceef1; stroke-dashoffset: 0"
        :style="{ strokeWidth }"
        :r="radius"
        :cx="centerOffset"
        :cy="centerOffset"
      />
      <circle
        ref="fillingCircle"
        style="
          fill: transparent;
          /*animation-name: filling;*/
          animation-timing-function: ease-in;
          /*animation-duration: 5s;*/
          /*transition-timing-function: ease-in;*/
          /*transition-duration: 0s;*/
          /*transition: 0.5s all;*/
          transform: rotate(-90deg);
        "
        :style="fillingCircleStyles"
        :r="radius"
        :cx="centerOffset"
        :cy="centerOffset"
      />
    </svg>

    <div
      v-if="isShowPercentage"
      style="
        position: absolute;
        overflow: hidden;
        /*border: 4px solid blue;*/
        box-sizing: border-box;
        border-radius: 100%;
      "
      :style="{
        width: innerBoxWidth,
        height: innerBoxWidth,
        top: strokeWidth,
        left: strokeWidth,
        border: innerBoxBorder
      }"
    >
      <slot
        :percentage="percentage"
        :inner-box-width-in-pixel="innerBoxWidthInPixel"
        :is-limit-reached="isLimitReached"
      >
        <div style="height: 100%; width: 100%; display: flex; justify-content: center">
          <div style="display: flex; flex-direction: column; justify-content: center">
            <span :style="{ fontSize: innerBoxWidthInPixel / 5 + 'px' }">
              {{ percentage + "%" }}
            </span>
          </div>
        </div>
      </slot>
    </div>
  </div>
</template>

<script lang="tsx">
import { defineComponent, PropType, ref } from "vue";
import { EnumSizingType } from "../ts/EnumSizingType";
import { VuePartialCssProperties } from "../ts/VuePartialCssProperties";

// source code URL=https://github.com/mkolsv/vue3-m-circle-progress-bar/blob/main/src/CircleProgressBar.vue
// 学习：https://www.cnblogs.com/daisygogogo/p/11044353.html
export default defineComponent({
  components: {},
  props: {
    progressMax: {
      type: Number,
      required: true
    },
    progress: {
      type: Number,
      required: true
    },
    sizingType: {
      type: String as PropType<EnumSizingType>,
      default: "border"
    },
    domSquareBoxWidth: {
      type: Number,
      default: 104
    },
    propsRadius: {
      type: Number,
      default: 49
    },
    colorFilled: {
      type: Array as PropType<string[]>,
      default: () => [
        "#ff0000",
        "#ff2600",
        "#ff4d00",
        "#ff7300",
        "#ff9900",
        "#ffbf00",
        "#ffe500",
        "#f2ff00",
        "#ccff00",
        "#a6ff00",
        "#80ff00",
        "#59ff00",
        "#33ff00",
        "#0dff00",
        "#00ff19",
        "#00ff40",
        "#00ff66",
        "#00ff8c",
        "#00ffb3",
        "#00ffd9",
        "#00ffff"
      ]
    },
    colorUnfilled: {
      type: String,
      default: "#3BB44A"
    },
    isShowPercentage: {
      type: Boolean,
      default: true
    },
    rounded: {
      type: Boolean,
      default: true
    },
    transitionDurationInSeconds: {
      type: Number,
      default: 0.5
    },
    strokeWidthInPixel: {
      type: Number,
      default: 6
    },
    propsInnerBoxBorder: {
      type: String,
      default: ""
    }
  },
  emits: ["reached"],
  setup(props, ctx) {
    const templateRoot = ref<HTMLDivElement>();
    const fillingCircle = ref<SVGCircleElement>();

    return {
      templateRoot,
      fillingCircle
    };
  },
  data() {
    return {};
  },
  computed: {
    boxWidthInPixel() {
      const myself = this;
      let result = 0;

      switch (myself.sizingType) {
        case "content": {
          result = myself.propsRadius! * 2 + myself.strokeWidthInPixel;
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
    radius() {
      const myself = this;
      let result = 0;

      switch (myself.sizingType) {
        case "content": {
          result = myself.propsRadius;
          break;
        }
        case "border":
        default: {
          result = myself.boxWidthInPixel / 2 - myself.strokeWidthInPixel * 0.5;
          break;
        }
      }

      return result;
    },
    centerOffset() {
      return this.boxWidthInPixel / 2;
    },
    innerBoxWidthInPixel() {
      return this.radius * 2 - this.strokeWidthInPixel;
    },
    innerBoxWidth() {
      return this.innerBoxWidthInPixel + "px";
    },
    strokeWidth() {
      return this.strokeWidthInPixel + "px";
    },
    isLimitReached() {
      return this.progressMax <= this.progress;
    },
    strokeColor() {
      const myself = this;
      let stroke: string;
      if (myself.isLimitReached) {
        stroke = myself.colorFilled[myself.colorFilled.length - 1] as string;
      } else {
        const strokeColorIndex = Math.floor(
          (myself.progress / myself.progressMax) * (myself.colorFilled.length - 1)
        );
        stroke = myself.colorFilled[strokeColorIndex] as string;
      }
      return stroke;
    },
    fillingCircleStyles(): VuePartialCssProperties {
      const myself = this;
      return {
        transitionDuration: myself.transitionDurationInSeconds + "s",
        stroke: myself.strokeColor,
        strokeDashoffset: myself.dashOffset + "",
        strokeDasharray: myself.dashArray + "",
        strokeLinecap: myself.rounded ? "round" : undefined,
        strokeWidth: myself.strokeWidth,
        transformOrigin: myself.centerOffset + "px " + myself.centerOffset + "px"
      };
    },
    currentFormatted() {
      return this.isLimitReached ? this.progressMax : this.progress;
    },
    dashArray() {
      return this.radius * Math.PI * 2;
    },
    dashOffset() {
      const myself = this;
      return myself.dashArray - (myself.dashArray * myself.currentFormatted) / myself.progressMax;
    },
    percentage() {
      return Math.floor((this.progress / this.progressMax) * 100);
    },
    innerBoxBorder() {
      const myself = this;
      const halfOfStrokeWidthInPixel = myself.strokeWidthInPixel / 6;
      const borderWidth = halfOfStrokeWidthInPixel >= 1 ? halfOfStrokeWidthInPixel : 1;
      return myself.propsInnerBoxBorder === ""
        ? borderWidth + "px solid " + myself.strokeColor
        : myself.propsInnerBoxBorder;
    }
  },
  watch: {
    isLimitReached(newValue, oldValue) {
      if (newValue !== oldValue) {
        this.$emit("reached", newValue);
      }
    }
  },
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

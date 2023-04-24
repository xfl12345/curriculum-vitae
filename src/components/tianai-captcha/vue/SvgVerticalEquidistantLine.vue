<template>
  <svg ref="templateRoot" :viewBox="'0 0 ' + viewBoxWidth + ' ' + viewBoxHeight">
    <path v-for="i in count" :key="i" :style="cssStyle" :d="thePathString(i - 1)" />
    <slot />
  </svg>
</template>

<script lang="tsx">
import { defineComponent, PropType, ref } from "vue";
import { cssMixer } from "../../xfl-common/ts/CssMixer";

type Point = {
  x: number;
  y: number;
};

const defaultCssStyle: Partial<CSSStyleDeclaration> = {
  fill: "transparent",
  stroke: "#4FC632",
  strokeLinecap: "round"
};

export default defineComponent({
  components: {},
  props: {
    viewBoxWidth: {
      type: Number,
      default: 36
    },
    viewBoxHeight: {
      type: Number,
      default: 36
    },
    count: {
      type: Number,
      default: 3
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
    const myself = this;

    return {};
  },
  computed: {
    verticalMarginInPixel() {
      const myself = this;
      // 总宽度 = 水平间距 * (元素数量 - 1) + 元素宽度 * 元素数量
      // 其中，设定 元素宽度 = 0.618 * 水平间距
      return myself.viewBoxWidth / (1.618 * myself.count - 1);
      // return (myself.viewBoxWidth - myself.count * myself.strokeWidthInPixel) / (myself.count - 1);
    },
    strokeWidthInPixel() {
      const myself = this;
      return myself.verticalMarginInPixel * 0.618;
    },
    strokeDasharrayInPixel() {
      const myself = this;
      return myself.viewBoxHeight + 2;
    },
    cssStyle(): Partial<CSSStyleDeclaration> {
      const myself = this;
      const theStyle: Partial<CSSStyleDeclaration> = cssMixer(defaultCssStyle, myself.propsCssStyle);
      theStyle.strokeWidth = myself.strokeWidthInPixel + "px";
      theStyle.strokeDashoffset = "0";
      theStyle.strokeDasharray = "" + myself.strokeDasharrayInPixel;
      return theStyle;
    },
    isRoundedStrokeLinecap() {
      return "strokeLinecap" in this.cssStyle && this.cssStyle.strokeLinecap === "round";
    }
  },
  watch: {},
  beforeCreate() {},
  created() {},
  beforeMount() {},
  mounted() {
    const myself = this;
  },
  beforeUpdate() {},
  updated() {},
  activated() {},
  deactivated() {},
  beforeUnmount() {},
  unmounted() {},
  methods: {
    thePathString(index: number): string {
      const myself = this;
      const start: Point = {
        x: index * myself.verticalMarginInPixel + (index + 0.5) * myself.strokeWidthInPixel,
        y: myself.isRoundedStrokeLinecap ? myself.strokeWidthInPixel / 2 : 0
      };

      return (
        "M" +
        myself.point2string(start) +
        " L" +
        myself.point2string(start) +
        " " +
        myself.point2string({ x: start.x, y: myself.viewBoxHeight - start.y })
      );
    },
    point2string(thePoint: Point): string {
      return thePoint.x + " " + thePoint.y;
    },
    calcPointDistance(a: Point, b: Point) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
  }
});
</script>

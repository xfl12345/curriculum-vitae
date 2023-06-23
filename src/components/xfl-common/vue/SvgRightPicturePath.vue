<template>
  <path ref="templateRoot" :style="cssStyle" :d="thePathString" />
</template>

<script lang="tsx">
import { defineComponent, PropType, ref } from "vue";
import { cssMixer } from "../ts/CssMixer";
import { PartialCssStyleType } from "../ts/PartialCssStyleType";

type Point = {
  x: number;
  y: number;
};

interface PointDict {
  [index: string]: Point;
}

const defaultCssStyle: PartialCssStyleType = {
  fill: "transparent",
  strokeWidth: "2px",
  stroke: "black",
  transitionDuration: "0.5s"
};

export default defineComponent({
  components: {},
  props: {
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    },
    offsetX: {
      type: Number,
      default: 0
    },
    offsetY: {
      type: Number,
      default: 0
    },
    delayShowPictureInMs: {
      type: Number,
      default: 100
    },
    propsCssStyle: {
      type: Object as PropType<PartialCssStyleType>,
      default: (): PartialCssStyleType => defaultCssStyle
    }
  },
  emits: [],
  setup(props, ctx) {
    const templateRoot = ref<HTMLDivElement>();
    // const cssStyle: PartialCssStyleType = {};

    return {
      templateRoot
    };
  },
  data() {
    const myself = this;

    return {
      isShowPic: myself.delayShowPictureInMs === 0
    };
  },
  computed: {
    points(): PointDict {
      const myself = this;
      const offsetHeight = myself.height + myself.offsetY;
      const offsetWidth = myself.width + myself.offsetX;
      const startY = offsetHeight * 0.618;
      return {
        start: { x: myself.offsetX, y: startY },
        breakPoint: { x: offsetHeight - startY, y: offsetHeight },
        end: { x: offsetWidth, y: myself.offsetY }
      };
    },
    thePathString(): string {
      const myself = this;
      let d = "M" + myself.point2string(myself.points.start);
      d += " " + myself.point2string(myself.points.breakPoint);
      d += " " + myself.point2string(myself.points.end);

      return d;
    },
    strokeDasharrayInPixel() {
      const myself = this;
      return (
        myself.calcPointDistance(myself.points.start, myself.points.breakPoint) +
        myself.calcPointDistance(myself.points.end, myself.points.breakPoint) +
        2
      );
    },
    cssStyle(): PartialCssStyleType {
      const myself = this;
      const theStyle: PartialCssStyleType = cssMixer(defaultCssStyle, myself.propsCssStyle);
      theStyle.strokeDashoffset = "" + (myself.isShowPic ? 0 : myself.strokeDasharrayInPixel);
      theStyle.strokeDasharray = "" + myself.strokeDasharrayInPixel;
      return theStyle;
    }
  },
  watch: {},
  beforeCreate() {},
  created() {},
  beforeMount() {},
  mounted() {
    const myself = this;
    if (!myself.isShowPic) {
      this.$nextTick(() => {
        setTimeout(() => {
          myself.isShowPic = true;
        }, myself.delayShowPictureInMs);
      });
    }
  },
  beforeUpdate() {},
  updated() {},
  activated() {},
  deactivated() {},
  beforeUnmount() {},
  unmounted() {},
  methods: {
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

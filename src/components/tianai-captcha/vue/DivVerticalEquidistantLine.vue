<template>
  <div
    ref="templateRoot"
    style="display: flex; justify-content: space-between"
    :style="{ width: boxWidth, height: boxHeight }"
  >
    <div
      v-for="i in count"
      :key="i"
      style="height: 100%"
      :style="[cssStyle, { width: pictureWidth, borderRadius: round ? pictureWidth : undefined }]"
    />
  </div>
</template>

<script lang="tsx">
import { defineComponent, PropType, ref } from "vue";
import { cssMixer } from "../../xfl-common/ts/CssMixer";

const defaultCssStyle: Partial<CSSStyleDeclaration> = {
  // backgroundColor: "#4FC632"
  backgroundColor: "#03DE00"
  // backgroundColor: "lawngreen"
  // backgroundColor: "limegreen"
};

export default defineComponent({
  components: {},
  props: {
    boxWidthInPixel: {
      type: Number,
      default: 22
    },
    boxHeightInPixel: {
      type: Number,
      default: 22
    },
    count: {
      type: Number,
      default: 3
    },
    deepInPixel: {
      type: Number,
      default: -1
    },
    useDefaultShadowStyle: {
      type: Boolean,
      default: true
    },
    round: {
      type: Boolean,
      default: true
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
    boxWidth() {
      return this.boxWidthInPixel + "px";
    },
    boxHeight() {
      return this.boxHeightInPixel + "px";
    },
    verticalMarginInPixel() {
      const myself = this;
      return myself.boxWidthInPixel / (1.618 * myself.count - 1);
      // return (myself.viewBoxWidth - myself.count * myself.strokeWidthInPixel) / (myself.count - 1);
    },
    pictureWidthInPixel() {
      const myself = this;
      return Math.ceil(myself.verticalMarginInPixel * 0.618);
    },
    pictureWidth() {
      return this.pictureWidthInPixel + "px";
    },
    defaultShadowStyle() {
      const myself = this;
      const deep = myself.deepInPixel < 0 ? myself.pictureWidthInPixel * (1 - 0.618) : myself.deepInPixel;
      // 黄金等腰三角形，凹槽深度做高，取底边的一半
      const spreadWidth = deep / Math.tan((72 / 180) * Math.PI);

      // return "0 0 " + spreadWidth * 1.618 + "px " + spreadWidth + "px #999999 inset";
      return "0 0 " + myself.pictureWidthInPixel / 4 + "px " + spreadWidth + "px #999999 inset";
    },
    cssStyle(): Partial<CSSStyleDeclaration> {
      const myself = this;
      const theStyle: Partial<CSSStyleDeclaration> = cssMixer(defaultCssStyle, myself.propsCssStyle);
      if (myself.useDefaultShadowStyle) {
        theStyle.boxShadow = myself.defaultShadowStyle;
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

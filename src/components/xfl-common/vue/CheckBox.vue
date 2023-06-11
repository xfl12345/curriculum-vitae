<template>
  <div ref="templateRoot" :style="{ fontSize: theFontSize }">
    <div style="display: flex">
      <div ref="checkbox" :style="[{ width: theFontSize, height: theFontSize }, theCheckBoxStyle]">
        <div style="height: 100%; width: 100%" />
      </div>
      <div>{{ theLable }}</div>
    </div>
  </div>
</template>

<script lang="tsx">
import { defineComponent, PropType, ref } from "vue";
import { cssMixer } from "../ts/CssMixer";
import { PartialCssStyleType } from "../ts/PartialCssStyleType";

const defaultCssStyle: PartialCssStyleType = {
  backgroundColor: "blue"
};

export default defineComponent({
  components: {},
  props: {
    theFontSizeInPixel: {
      type: Number,
      default: 24
    },
    checkIcon: {
      type: String,
      default: ""
    },
    uncheckIcon: {
      type: String,
      default: ""
    },
    theLable: {
      type: String,
      default: ""
    },
    propsCssStyle4CheckBox: {
      type: Object as PropType<PartialCssStyleType>,
      default: (): PartialCssStyleType => defaultCssStyle
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
    return {
      checked: false
    };
  },
  computed: {
    theFontSize(): string {
      return this.theFontSizeInPixel + "px";
    },
    theCheckBoxStyle(): PartialCssStyleType {
      const myself = this;
      return cssMixer(defaultCssStyle, myself.propsCssStyle4CheckBox);
    },
    theCheckBoxIconStyle(): PartialCssStyleType {
      const myself = this;
      return {
        // backgroundImage:
        // TODO 继续实现“记住我”功能
      };
    }
  }
});
</script>

<template>
  <div
    ref="templateRoot"
    style="
      background-color: transparent;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: row;
      justify-content: center;
    "
  >
    <!-- 已水平方向居中 -->
    <div
      ref="columnCenterBox"
      style="background-color: transparent; display: flex; flex-direction: column; justify-content: center"
      :style="{ flexGrow: xGrow, flexShrink: xShrink, flexBasis: xBasis }"
    >
      <!-- 已竖直方向居中 -->
      <div
        ref="rowCenterBox"
        style="background-color: transparent"
        :style="{ flexGrow: yGrow, flexShrink: yShrink, flexBasis: yBasis }"
      >
        <slot>
          <div></div>
        </slot>
      </div>
    </div>
  </div>
</template>

<script lang="tsx">
import { defineComponent, ref } from "vue";

export default defineComponent({
  props: {
    xGrow: {
      type: String,
      default: "0"
    },
    xBasis: {
      type: String,
      default: "auto"
    },
    xShrink: {
      type: String,
      default: "1"
    },
    yGrow: {
      type: String,
      default: "0"
    },
    yBasis: {
      type: String,
      default: "auto"
    },
    yShrink: {
      type: String,
      default: "1"
    }
  },
  setup() {
    const templateRoot = ref<HTMLDivElement>();
    const columnCenterBox = ref<HTMLDivElement>();
    const rowCenterBox = ref<HTMLDivElement>();
    return {
      templateRoot,
      columnCenterBox,
      rowCenterBox
    };
  },
  data() {
    return {};
  },
  watch: {},
  mounted() {},
  methods: {}
});
</script>

<style scoped></style>

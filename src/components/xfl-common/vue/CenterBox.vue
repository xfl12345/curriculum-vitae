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
      v-if="calcDone"
      ref="columnCenterBox"
      style="background-color: transparent; display: flex; flex-direction: column; justify-content: center"
      :style="{ flexGrow: xGrow, flexBasis: xBasis }"
    >
      <!-- 已竖直方向居中 -->
      <div
        ref="rowCenterBox"
        style="background-color: transparent"
        :style="{ flexGrow: yGrow, flexBasis: yBasis }"
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
  // name: "CenterBox",
  props: {
    // contentBoxWidth: {
    //   type: String,
    //   // default: "content"
    //   default: "auto"
    // },
    // contentBoxHeight: {
    //   type: String,
    //   default: "auto"
    // },
    xGrow: {
      type: String,
      default: "0"
    },
    xBasis: {
      type: String,
      default: "0"
    },
    yGrow: {
      type: String,
      default: "0"
    },
    yBasis: {
      type: String,
      default: "0"
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
    return {
      calcDone: true
    };
  },
  watch: {
    // contentBoxWidth(inputValue, oldValue) {
    //   if (inputValue !== oldValue) {
    //     this.initColumnCenterBox();
    //   }
    // },
    // contentBoxHeight(inputValue, oldValue) {
    //   if (inputValue !== oldValue) {
    //     this.initRowCenterBox();
    //   }
    // }
  },
  mounted() {
    // const myself = this;
    // this.initColumnCenterBox();
    // this.initRowCenterBox();
  },
  methods: {
    // setStyle(style: CSSStyleDeclaration, inputLength: string) {
    //   if (inputLength.endsWith("%")) {
    //     const percent = inputLength.substring(0, inputLength.length - 1);
    //     style.flexGrow = "" + Number.parseFloat(percent) / 100;
    //     style.flexBasis = "0";
    //   } else if (inputLength !== "") {
    //     style.width = inputLength;
    //   }
    // },
    // initRowCenterBox() {
    //   const myself = this;
    //   myself.setStyle(myself.rowCenterBox!.style, myself.contentBoxHeight);
    // },
    // initColumnCenterBox() {
    //   const myself = this;
    //   myself.setStyle(myself.columnCenterBox!.style, myself.contentBoxWidth);
    // }
  }
});
</script>

<style scoped></style>

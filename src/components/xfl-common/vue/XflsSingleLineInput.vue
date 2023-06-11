<template>
  <div
    ref="templateRoot"
    style="
      box-sizing: border-box;
      width: 100%;
      display: flex;
      white-space: nowrap;
      border-style: solid;
      border-width: 1px;
      overflow: hidden;
      vertical-align: top;
      padding: 0;
    "
    :style="{ fontSize: theFontSizeInPixel + 'px', borderColor, borderRadius }"
  >
    <div
      style="
        /*box-sizing: border-box;*/
        background-color: deepskyblue;
        height: 100%;
        vertical-align: top;
        /*outline-style: none;*/
      "
      :style="{
        width: theTitleBoxWidth,
        padding: '0 ' + borderRadius
      }"
      @click="inputAreaGetFocus"
    >
      <slot name="titleLeft" />
      <slot name="title">
        {{ theTitle }}
      </slot>
      <slot name="titleRight" />
    </div>
    <slot name="inputLeft" />
    <div
      style="flex-grow: 1; flex-shrink: 1; box-sizing: border-box; cursor: text; display: flex"
      :style="{ padding: '0 ' + borderRadius }"
      @click="inputAreaGetFocus"
    >
      <input
        ref="inputArea"
        :value="theInputValue"
        style="
          box-sizing: border-box;
          width: 0;
          border: none;
          resize: none;
          padding: 0;
          outline: none;
          vertical-align: top;
          height: 100%;
          /*width: 100%;*/
          background-color: transparent;
          font-family: inherit;
          /*-webkit-text-fill-color: yellow;*/
          /*color: white;*/
          color: yellow;

          min-width: 1px;
          flex-grow: 1;
          flex-shrink: 1;
          /*display: none;*/
        "
        class="xflsSingleLineInputInternalCss"
        :style="{ fontSize: theFontSizeInPixel + 'px' }"
        :placeholder="placeholder"
        :type="theInputType"
        @input="popInputValue"
        @focus="onFocusInput"
        @blur="onBlurInput"
        @keydown.enter="onKeyDownEnter"
      />
      <!--<div style="box-sizing: border-box; height: 100%; width: 100%; vertical-align: top">-->
      <!--</div>-->
    </div>
    <slot name="inputRight" />
  </div>
</template>

<script lang="tsx">
import { defineComponent, ref } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  props: {
    theFontSizeInPixel: {
      type: Number,
      default: 24
    },
    theTitle: {
      type: String,
      required: true
    },
    theTitleBoxWidth: {
      type: String,
      default: "auto"
    },
    propsPlaceholder: {
      type: String,
      default: undefined
    },
    theInputType: {
      type: String,
      default: "text"
    },
    theInputValue: {
      type: String,
      required: true
    }
  },
  emits: ["update:theInputValue", "onKeyDownEnter"],
  setup() {
    const templateRoot = ref<HTMLDivElement>();
    const inputArea = ref<HTMLInputElement>();
    const { t } = useI18n();

    return {
      templateRoot,
      inputArea,
      t
    };
  },
  data() {
    return {
      borderColor: "deepskyblue",
      originBorderColor: "deepskyblue"
    };
  },
  computed: {
    borderRadius() {
      return Math.ceil(this.theFontSizeInPixel / 2) + "px";
    },
    placeholder() {
      const myself = this;
      return typeof myself.propsPlaceholder === "undefined"
        ? myself.t("message.pleaseEnter") + myself.theTitle
        : myself.propsPlaceholder;
    }
  },
  mounted() {},
  methods: {
    inputAreaGetFocus() {
      const myself = this;
      myself.inputArea!.focus();
    },
    onFocusInput() {
      this.borderColor = "aqua";
    },
    onBlurInput() {
      const myself = this;
      myself.borderColor = myself.originBorderColor;
    },
    onKeyDownEnter() {
      this.$emit("onKeyDownEnter");
    },
    popInputValue(event: Event) {
      this.$emit("update:theInputValue", "" + (event.target as HTMLInputElement)!.value);
    }
  }
});
</script>

<style scoped>
.xflsSingleLineInputInternalCss::placeholder {
  color: darkgreen;
}

.xflsSingleLineInputInternalCss::-webkit-input-placeholder {
  color: darkgreen;
}

.xflsSingleLineInputInternalCss::-moz-placeholder {
  color: darkgreen;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
}
input[type="number"] {
  appearance: none;
  -webkit-appearance: none;
  /* -moz-appearance: none; */
  -moz-appearance: textfield;
}
</style>

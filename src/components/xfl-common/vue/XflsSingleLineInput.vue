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
    "
    :style="{ fontSize: theFontSizeInPixel + 'px', borderColor, borderRadius }"
  >
    <div
      style="background-color: deepskyblue"
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
      style="flex-grow: 1; box-sizing: border-box; cursor: text; display: flex"
      :style="{ padding: '0 ' + borderRadius }"
      @click="inputAreaGetFocus"
    >
      <input
        ref="inputArea"
        v-model="myInputValue"
        style="
          border: none;
          resize: none;
          padding: 0;
          outline: none;
          vertical-align: middle;
          height: 100%;
          flex-grow: 1;
          background-color: transparent;
          font-family: inherit;
          /*-webkit-text-fill-color: yellow;*/
          /*color: white;*/
          color: yellow;
        "
        class="xflsSingleLineInputInternalCss"
        :style="{ fontSize: theFontSizeInPixel + 'px' }"
        :placeholder="placeholder"
        :type="theInputType"
        @focus="onFocusInput"
        @blur="onBlurInput"
        @keydown.enter="onKeyDownEnter"
      />
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
    inputValue: {
      get(): string {
        return this.theInputValue;
      },
      set(value: string) {
        this.$emit("update:theInputValue", value);
      }
    },
    myInputValue: {
      get(): string | number | any {
        return this.inputValue;
      },
      set(value: any) {
        this.inputValue = value + "";
      }
    },
    borderRadius() {
      return this.theFontSizeInPixel / 2 + "px";
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
  -moz-appearance: none;
  /*-moz-appearance: textfield;*/
}
</style>

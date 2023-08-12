<template>
  <div
    ref="templateRoot"
    style="display: flex"
    :style="{ height: theFontSizeInPixel + 6 + 'px', fontSize: theFontSizeInPixel + 'px' }"
  >
    <div ref="rootBoxOfKey" style="font-weight: bold" :style="rootBoxStyleOfKey">
      <center-box>
        <div
          style="text-align: justify-all; text-align-last: justify; white-space: nowrap"
          :style="{ width: theWidthOfTheBoxOfKey }"
        >
          {{ keyValuePair.theKey }}
        </div>
      </center-box>
    </div>
    <div
      style="
        flex-grow: 4;
        flex-basis: 0;
        cursor: pointer;
        transition-property: background-color;
        transition-timing-function: ease-out;
        transition-duration: 1s;
      "
      :style="{ backgroundColor: displayValueBackgroundColor }"
      @mouseover="showCopyIcon"
      @mouseout="preRemoveCopyIcon"
      @mousedown="mouseDownHandler"
      @mouseup="mouseUpHandler"
    >
      <center-box x-grow="1">
        <div style="position: relative">
          <div
            v-if="isShowCopyIcon"
            style="
              position: absolute;
              right: 0;
              z-index: 1;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: center;
            "
          >
            <div>
              <div v-if="!copyActionFeedback.activated">
                <copy-one theme="outline" :size="theFontSizeInPixel - 1" fill="#333" />
              </div>
              <div
                v-if="copyActionFeedback.activated"
                style="background-color: darkgreen; color: white"
                :style="{
                  fontSize: theFontSizeInPixel * 0.8 + 'px',
                  borderRadius: theFontSizeInPixel + 'px',
                  paddingLeft: theFontSizeInPixel / 2 + 'px',
                  paddingRight: theFontSizeInPixel / 2 + 'px'
                }"
              >
                复制成功
              </div>
            </div>
          </div>
          <div>
            <text-prettier
              ref="valueBox"
              :content="keyValuePair.theDisplayValue"
              style="vertical-align: middle"
            />
          </div>
        </div>
      </center-box>
    </div>
  </div>
</template>

<script lang="tsx">
import { defineComponent, ref } from "vue";
import { CopyOne } from "@icon-park/vue-next";
import { Clipboard } from "v-clipboard";
import { KeyValuePair } from "@/tsmod/KeyValuePair";
import CenterBox from "@/components/xfl-common/vue/CenterBox.vue";
import TextPrettier from "@/components/xfl-common/vue/TextPrettier.vue";
import { PartialCssStyleType } from "@/components/xfl-common/ts/PartialCssStyleType";

export default defineComponent({
  components: { TextPrettier, CenterBox, CopyOne },
  props: {
    keyValuePair: {
      type: KeyValuePair,
      default: () => {
        return KeyValuePair.createBlankInstance();
      }
    },
    theMaxFontCount: {
      type: Number,
      default: 4
    },
    theFontSizeInPixel: {
      type: Number,
      default: 24
    },
    fixedKeyRootBoxWidth: {
      type: String,
      default: "auto"
    }
  },
  setup(props, ctx) {
    const templateRoot = ref<HTMLDivElement>();
    const valueBox = ref<HTMLDivElement>();
    const rootBoxOfKey = ref<HTMLDivElement>();

    return { templateRoot, valueBox, rootBoxOfKey };
  },
  data() {
    return {
      isShowCopyIcon: false,
      isPreRemoveCopyIcon: false,
      copyActionFeedback: {
        activated: false,
        succeed: false
      },
      mouseEventRecord: {
        keyDown: {
          x: 0,
          y: 0
        }
      }
    };
  },
  computed: {
    theWidthOfTheBoxOfKey(): string {
      const pixel = this.theFontSizeInPixel * this.theMaxFontCount;
      return pixel + "px";
    },
    displayValueBackgroundColor() {
      if (this.isShowCopyIcon || this.copyActionFeedback.activated) {
        if (this.copyActionFeedback.activated) {
          return this.copyActionFeedback.succeed ? "aqua" : "red";
        }

        return "yellow";
      }

      return undefined;
    },
    rootBoxStyleOfKey(): PartialCssStyleType {
      const myself = this;
      return (
        myself.fixedKeyRootBoxWidth === "auto"
          ? {
              flexGrow: 2,
              flexBasis: 0
            }
          : { width: myself.fixedKeyRootBoxWidth }
      ) as PartialCssStyleType;
    }
  },
  methods: {
    preRemoveCopyIcon() {
      const myself = this;
      myself.isPreRemoveCopyIcon = true;
      setTimeout(() => {
        if (myself.isPreRemoveCopyIcon) {
          myself.isShowCopyIcon = false;
          myself.isPreRemoveCopyIcon = false;
        }
      }, 100);
    },
    showCopyIcon() {
      const myself = this;
      myself.isPreRemoveCopyIcon = false;
      myself.isShowCopyIcon = true;
    },
    copyValue2ClipBoard() {
      const myself = this;
      const timeout = 3000;
      Clipboard.copy(myself.keyValuePair!.theCopyValue).then(
        (value) => {
          myself.copyActionFeedback.succeed = true;
          myself.copyActionFeedback.activated = true;
          setTimeout(() => {
            myself.copyActionFeedback.activated = false;
          }, timeout);
        },
        (reason) => {
          myself.copyActionFeedback.succeed = false;
          myself.copyActionFeedback.activated = true;
          setTimeout(() => {
            myself.copyActionFeedback.activated = false;
          }, timeout);
        }
      );
    },
    mouseDownHandler(event: MouseEvent) {
      this.mouseEventRecord.keyDown.x = event.x;
      this.mouseEventRecord.keyDown.y = event.y;
    },
    mouseUpHandler(event: MouseEvent) {
      const myself = this;
      const keyDown = myself.mouseEventRecord.keyDown;
      const tolerance = myself.theFontSizeInPixel / 4;
      if (Math.abs(event.x - keyDown.x) <= tolerance && Math.abs(event.y - keyDown.y) <= tolerance) {
        myself.copyValue2ClipBoard();
      }
    }
  }
});
</script>

<template>
  <div
    ref="templateRoot"
    :style="{
      padding: enablePadding ? buttonRadiusInPixel - barHeightInPixel / 2 + 1 + 'px 0' : undefined
    }"
  >
    <div
      style="
        background-color: rgb(223 225 226);
        position: relative;
        /*box-shadow: 0 0 2px 0 rgb(211 213 215) inset;*/
        box-shadow: 0 0 2px 0 rgb(160 162 165) inset;
        display: flex;
        flex-direction: row;
        justify-content: center;
      "
      :style="barCssStyle"
    >
      <div style="display: flex; flex-direction: column; justify-content: center">
        <div style="user-select: none; white-space: nowrap" :style="placeholderStyle">
          {{ placeholder }}
        </div>
      </div>
      <captcha-slider-button
        ref="sliderButton"
        style="position: absolute"
        :style="[buttonCssStyle, { transform: buttonTransform }]"
        :dom-square-box-width="buttonDomSizeInPixel"
        :is-disabled="isButtonDisabled"
        :touch-move-prevent-default="true"
        @button-on-mouse-down="buttonOnMouseDown"
        @button-on-mouse-up="buttonOnMouseUp"
        @button-on-touch-start="buttonOnTouchStart"
        @button-on-touch-end="buttonOnTouchEnd"
      />
    </div>
  </div>
</template>

<script lang="tsx">
import { defineComponent, PropType, ref } from "vue";
import { cssMixer } from "@/components/xfl-common/ts/CssMixer";
import { VuePartialCssProperties } from "@/components/xfl-common/ts/VuePartialCssProperties";
import { TianaiTrackEvent } from "../ts/TianaiTrackEvent";
import { getPoint2DFromMouseEvent, getPoint2DFromTouchEvent, Point2D } from "../ts/Point";
import CaptchaSliderButton from "./CaptchaSliderButton.vue";

const defaultCssStyle: VuePartialCssProperties = {
  color: "#88949d"
};

export default defineComponent({
  components: { CaptchaSliderButton },
  props: {
    barWidthInPixel: {
      type: Number,
      default: 260
    },
    barHeightInPixel: {
      type: Number,
      default: 38
    },
    allowResume: {
      type: Boolean,
      default: true
    },
    placeholder: {
      type: String,
      default: "拖动滑块至正确位置"
    },
    propsPlaceholderStyle: {
      type: Object as PropType<VuePartialCssProperties>,
      default: (): VuePartialCssProperties => {
        return defaultCssStyle;
      }
    },
    enablePadding: {
      type: Boolean,
      default: true
    },
    enablePrintLog: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    "buttonOnMouseDown",
    "buttonOnMouseUp",
    "buttonOnTouchStart",
    "buttonOnTouchEnd",
    "moveStart",
    "moving",
    "moveEnd"
  ],
  setup(props, ctx) {
    const templateRoot = ref<HTMLDivElement>();
    const sliderButton = ref<InstanceType<typeof CaptchaSliderButton>>();

    const printLog = props.enablePrintLog
      ? (...params: any[]) => console.log(params)
      : (...params: any[]) => {};
    return {
      templateRoot,
      sliderButton,
      printLog
    };
  },
  data() {
    const trackBook: Map<string, TianaiTrackEvent> = new Map<string, TianaiTrackEvent>();
    const trackCallBackCleanerBook: Map<string, () => any> = new Map<string, () => any>();
    return {
      trackBook,
      trackCallBackCleanerBook,
      currentTrackId: "",
      buttonTransform: "translate(0,0)",
      resumeOffsetX: 0,
      isButtonDisabled: false
    };
  },
  computed: {
    buttonAvailableOffsetX() {
      const myself = this;

      return myself.barWidthInPixel - myself.buttonRadiusInPixel * 2;
    },
    barCssStyle(): VuePartialCssProperties {
      const myself = this;
      const theStyle: VuePartialCssProperties = {};
      theStyle.width = myself.barWidthInPixel + "px";
      theStyle.height = myself.barHeightInPixel + "px";
      theStyle.borderRadius = theStyle.height;
      // if (myself.enablePadding) {
      //   theStyle.padding = `${myself.barHeightInPixel / 2}px 0`;
      // }

      return theStyle;
    },
    buttonDomSizeInPixel() {
      const myself = this;
      return myself.barHeightInPixel * 2;
    },
    buttonRadiusInPixel() {
      const myself = this;
      return myself.sliderButton ? myself.sliderButton.radiusInPixel : 0;
    },
    buttonLeftOffset() {
      const myself = this;
      return -(myself.buttonDomSizeInPixel / 2 - myself.buttonRadiusInPixel);
    },
    buttonCssStyle(): VuePartialCssProperties {
      const myself = this;
      const theStyle: VuePartialCssProperties = {};
      theStyle.top = -myself.barHeightInPixel / 2 + "px";
      theStyle.left = myself.buttonLeftOffset + "px";

      return theStyle;
    },
    placeholderStyle(): VuePartialCssProperties {
      const myself = this;
      return cssMixer(defaultCssStyle, myself.propsPlaceholderStyle);
    }
  },
  watch: {},
  beforeCreate() {},
  created() {},
  beforeMount() {},
  mounted() {
    const myself = this;
    // myself.buttonLeftOffset = -(myself.buttonDomSizeInPixel / 2 - myself.sliderButton!.radiusInPixel);
    // console.log(
    //   "buttonDomSizeInPixel",
    //   myself.buttonDomSizeInPixel,
    //   "radiusInPixel",
    //   myself.sliderButton!.radiusInPixel,
    //   "buttonLeftOffset",
    //   myself.buttonLeftOffset
    // );
  },
  beforeUpdate() {},
  updated() {},
  activated() {},
  deactivated() {},
  beforeUnmount() {},
  unmounted() {},
  methods: {
    resetButton() {
      const myself = this;
      myself.trackBook.clear();
      myself.currentTrackId = "";
      myself.sliderButton!.isMoving = false;
      myself.buttonTransform = "translate(0, 0)";
      myself.isButtonDisabled = false;
    },
    trackRecordHelper(trackRecord: TianaiTrackEvent, point: Point2D, currentTime: Date, type: string) {
      const myself = this;
      const startTime = trackRecord.startTime;
      const startPoint = trackRecord.startPoint;
      const end = myself.buttonAvailableOffsetX;
      let moveX = point.x - startPoint!.x;
      trackRecord.tracks.push({
        x: moveX,
        y: point.y - startPoint!.y,
        type,
        t: currentTime.getTime() - startTime!.getTime()
      });

      if (myself.allowResume) {
        moveX = myself.resumeOffsetX + moveX;
      }
      if (moveX < 0) {
        moveX = 0;
      } else if (moveX > end) {
        moveX = end;
      }
      trackRecord.moveX = moveX;
      trackRecord.movePercent = moveX / myself.buttonAvailableOffsetX;
    },
    onMoveStart(startPoint: Point2D, isMouseEvent: boolean) {
      const myself = this;
      const startTime = new Date();
      let id: string;
      let trackRecord: TianaiTrackEvent;
      if (myself.currentTrackId !== "") {
        if (myself.allowResume) {
          id = myself.currentTrackId;
          trackRecord = myself.trackBook.get(id)!;
          trackRecord.startPoint = startPoint;
        } else {
          return;
        }
      } else {
        id = startTime.toTimeString() + "_" + startTime.getMilliseconds() + "_" + Math.random();
        trackRecord = new TianaiTrackEvent();
        trackRecord.startTime = startTime;
        trackRecord.startPoint = startPoint;
        myself.trackBook.set(id, trackRecord);
        if (myself.trackBook.size === 1) {
          myself.currentTrackId = id;
        } else {
          myself.trackBook.delete(id);
          return;
        }
      }

      trackRecord.tracks.push({
        x: 0,
        y: 0,
        type: "down",
        t: new Date().getTime() - startTime.getTime()
      });

      if (isMouseEvent) {
        // pc
        const onMovingCallback = (event: MouseEvent) => {
          myself.onMoving(getPoint2DFromMouseEvent(event, true));
        };
        const onMoveEndCallback = (event: MouseEvent) => {
          myself.onMoveEnd(getPoint2DFromMouseEvent(event, true));
        };

        window.addEventListener("mousemove", onMovingCallback);
        window.addEventListener("mouseup", onMoveEndCallback);

        myself.trackCallBackCleanerBook.set(id, () => {
          window.removeEventListener("mousemove", onMovingCallback);
          window.removeEventListener("mouseup", onMoveEndCallback);
          myself.trackCallBackCleanerBook.delete(id);
        });
      } else {
        const onMovingCallback = (event: TouchEvent) => {
          myself.onMoving(getPoint2DFromTouchEvent(event, true));
        };
        const onMoveEndCallback = (event: TouchEvent) => {
          // console.log(event.type, event);
          myself.onMoveEnd(getPoint2DFromTouchEvent(event, true));
        };
        // 手机端
        window.addEventListener("touchmove", onMovingCallback, false);
        window.addEventListener("touchend", onMoveEndCallback, false);

        myself.trackCallBackCleanerBook.set(id, () => {
          window.removeEventListener("touchmove", onMovingCallback);
          window.removeEventListener("touchend", onMoveEndCallback);
          myself.trackCallBackCleanerBook.delete(id);
        });
      }
      myself.$emit("moveStart", trackRecord);
    },
    onMoving(point: Point2D) {
      const myself = this;
      const currentTime = new Date();
      const trackRecord = myself.trackBook.get(myself.currentTrackId)!;
      myself.trackRecordHelper(trackRecord, point, currentTime, "move");
      myself.buttonTransform = "translate(" + trackRecord.moveX + "px, 0)";
      myself.$emit("moving", trackRecord);
    },
    onMoveEnd(point: Point2D) {
      const myself = this;
      const currentTime = new Date();
      const trackId = myself.currentTrackId;
      // 清除 window 事件监听器
      myself.trackCallBackCleanerBook.get(trackId)!();

      const trackRecord = myself.trackBook.get(trackId)!;
      myself.trackRecordHelper(trackRecord, point, currentTime, "up");
      trackRecord.stopTime = currentTime;

      if (myself.allowResume) {
        myself.resumeOffsetX = trackRecord.moveX;
      } else {
        myself.isButtonDisabled = true;
      }

      myself.$emit("moveEnd", trackRecord);
    },
    // sliderButtonWidthCallback(radius: number) {
    //   this.sliderButtonWidthInPixel = radius;
    // },
    buttonOnMouseDown(event: MouseEvent) {
      this.printLog("buttonOnMouseDown", event);
      this.onMoveStart(getPoint2DFromMouseEvent(event, true), true);
      this.$emit("buttonOnMouseDown", event);
    },
    buttonOnMouseUp(event: MouseEvent) {
      this.printLog("buttonOnMouseUp", event);
      this.$emit("buttonOnMouseUp", event);
    },
    buttonOnTouchStart(event: TouchEvent) {
      this.printLog("buttonOnTouchStart", event);
      this.onMoveStart(getPoint2DFromTouchEvent(event, true), false);
      this.$emit("buttonOnTouchStart", event);
    },
    buttonOnTouchEnd(event: TouchEvent) {
      this.printLog("buttonOnTouchEnd", event);
      // event.preventDefault();
      this.$emit("buttonOnTouchEnd", event);
    }
  }
});
</script>

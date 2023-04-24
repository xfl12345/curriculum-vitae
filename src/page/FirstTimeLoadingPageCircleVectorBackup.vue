<template>
  <div ref="templateRoot" style="height: 100vh; padding-top: 1vh">
    <div style="display: flex; justify-content: center">
      <div style="">
        <circle-progress-bar
          v-slot="slotProps"
          :progress="tmpValue"
          :progress-max="100"
          :rounded="true"
          :dom-square-box-width="1080"
          :stroke-width-in-pixel="40"
          sizing-type="border"
          :props-radius="400"
          :color-filled="circleProgressBarColorArray"
        >
          <div style="height: 100%; width: 100%">
            <div
              style="
                float: left;
                width: 50%;
                height: 100%;
                shape-outside: radial-gradient(farthest-side ellipse at right, transparent 98%, red);
              "
            />
            <div
              style="
                float: right;
                width: 50%;
                height: 100%;
                shape-outside: radial-gradient(farthest-side ellipse at left, transparent 98%, red);
              "
            />
            <div style="font-size: 5rem; text-align: center">
              <span
                :style="{
                  fontSize: slotProps.innerBoxWidthInPixel / (slotProps.isLimitReached ? 2.5 : 3) + 'px'
                }"
                >{{ slotProps.percentage + "%" }}</span
              >
              <span v-if="!slotProps.isLimitReached">{{ checkItemName }}</span>
            </div>
          </div>
        </circle-progress-bar>
        <br />
        <input v-model="tmpValue" type="number" />
      </div>
    </div>
  </div>
</template>

<script lang="tsx">
import { defineComponent, ref } from "vue";
import tinygradient from "tinygradient";
import CircleProgressBar from "../components/xfl-common/vue/CircleProgressBar.vue";

export default defineComponent({
  components: { CircleProgressBar },
  props: {},
  setup(props, ctx) {
    const templateRoot = ref<HTMLDivElement>();

    return {
      templateRoot
    };
  },
  data() {
    const circleProgressBarColorArray = tinygradient("red", "aqua")
      .hsv(101, "long")
      .map((item) => item.toHexString());
    return {
      tmpValue: 80,
      circleProgressBarColorArray,
      checkItemName: "正在检查您的浏览器，请稍等……"
    };
  },

  computed: {},
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

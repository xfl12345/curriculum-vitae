<template>
  <div style="width: 100%">
    <div
      ref="templateRoot"
      style="width: 100%; display: flex"
      :style="{ height: theFontSizeInPixel * 1.5 + 'px' }"
    >
      <div style="flex: 236076; background-color: #2d69bc; color: white; text-align: center">
        <center-box>
          <text-prettier
            style="white-space: nowrap"
            :style="{ fontSize: theFontSizeInPixel * 1.25 + 'px' }"
            :content="theTitle"
          />
          <!--<span >{{ theTitle }}</span>-->
        </center-box>
      </div>
      <div
        style="flex: 763924; background-color: #99beeb"
        :style="{ fontSize: theFontSizeInPixel * 1.25 + 'px' }"
      >
        <slot name="slogan">
          <center-box>
            <text-prettier style="white-space: nowrap; vertical-align: top" :content="theSlogan" />
          </center-box>
        </slot>
      </div>
    </div>
    <div style="width: 100%">
      <slot />
    </div>
  </div>
</template>

<script setup lang="tsx">
import { ref, defineProps } from "vue";
import CenterBox from "./xfl-common/vue/CenterBox.vue";
import TextPrettier from "./xfl-common/vue/TextPrettier.vue";

defineProps({
  theFontSizeInPixel: {
    type: Number,
    default: 24
  },
  theTitle: {
    type: String,
    default: ""
  },
  theSlogan: {
    type: String,
    default: ""
  }
});

const templateRoot = ref<HTMLDivElement>();
</script>

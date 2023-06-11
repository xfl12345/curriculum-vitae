<template>
  <div
    ref="templateRoot"
    style="display: flex; flex-direction: column; justify-content: space-around"
    :style="{ fontSize: theFontSize, height: pageMinHeight }"
  >
    <div v-for="item in routes" :key="item.path">
      <div style="display: flex; flex-direction: row; justify-content: center">
        <div
          class="myIndexButton"
          style="box-sizing: border-box; color: white; width: 1000px; cursor: pointer"
          :style="{
            padding: cardPadding,
            borderRadius: cardHeight,
            height: cardHeight
          }"
          @click="jumpPage(String(item.name))"
        >
          <center-box>
            <div :style="{ lineHeight: theFontSize }">
              <span style="vertical-align: top; white-space: nowrap">{{
                t("routerName." + String(item.name))
              }}</span>
            </div>
          </center-box>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="tsx">
import { defineComponent, ref } from "vue";
import { useStore } from "vuex";
import { useI18n } from "vue-i18n";
import { RouteRecord, useRouter } from "vue-router";
import { isUndefinedOrNull } from "../components/xfl-common/ts/IsUndefinedOrNull";
import { isDefinedAndNotNull } from "../components/xfl-common/ts/IsDefinedAndNotNull";
import CenterBox from "../components/xfl-common/vue/CenterBox.vue";

export default defineComponent({
  components: { CenterBox },
  props: {},
  emits: [],
  setup(props, ctx) {
    const templateRoot = ref<HTMLDivElement>();

    const router = useRouter();
    const store = useStore();
    const { t } = useI18n();

    return {
      templateRoot,
      router,
      store,
      t
    };
  },
  data() {
    return {
      cardPaddingInPixel: 10
    };
  },
  computed: {
    theFontSizeInPixel() {
      return Math.ceil(this.store.getters.theFontSizeInPixel);
    },
    theFontSize() {
      return this.theFontSizeInPixel + "px";
    },
    cardPadding() {
      return this.cardPaddingInPixel + "px";
    },
    cardHeightInPixel() {
      const myself = this;
      return Math.ceil(myself.theFontSizeInPixel) + 2 * myself.cardPaddingInPixel;
    },
    cardHeight() {
      return this.cardHeightInPixel + "px";
    },
    pageMinHeight() {
      const myself = this;
      return myself.cardHeightInPixel * myself.routes.length * 2 + "px";
    },
    routes(): RouteRecord[] {
      const myself = this;
      return myself.router.getRoutes().filter((item) => {
        return isDefinedAndNotNull(item.name);
      });
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
  methods: {
    isDefinedAndNotNull,
    isUndefinedOrNull,
    jumpPage(name: string) {
      const myself = this;
      if (name === "firstTimeLoadingPage") {
        myself.router.push({ name, query: { exhibition: "true" } });
      } else {
        myself.router.push({ name });
      }
    }
  }
});
</script>

<style scoped>
.myIndexButton {
  background-color: green;
}
.myIndexButton:hover {
  background-color: deepskyblue;
}
</style>

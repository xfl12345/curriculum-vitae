<template>
  <div :style="{ fontFamily }">
    <router-view />
  </div>
</template>

<script setup lang="tsx">
import { computed } from "vue";
import { RouterView } from "vue-router";
import { useStore } from "vuex";

const store = useStore();

const fontFamily = computed(() => {
  return store.state.diyFontFamilyList.join(", ") + ", " + store.state.browserDefaultFontFamily;
});
// console.log(fontFamily.value);
</script>

<template>
  <div :style="{ fontFamily }">
    <router-view />
  </div>
</template>

<script setup lang="tsx">
import { computed } from "vue";
import { RouterView, useRouter } from "vue-router";
import { useStore } from "vuex";

const store = useStore();
const router = useRouter();

const fontFamily = computed(() => {
  return (
    store.state.diyFontFamilyList.join(", ") +
    ", " +
    store.state.diyDefaultFontFamilyList.join(", ") +
    ", " +
    store.state.browserDefaultFontFamily
  );
});
// console.log(window.location.href);
// console.log(new URL(window.location.href).href);
// console.log(window.location.hash);

if (!store.state.browserInitiated) {
  let tmp = window.location.hash as string | undefined;
  let ok = false;
  if (typeof tmp !== "undefined" && tmp.length > 2) {
    tmp = tmp.slice(2, tmp.length);
    ok = true;
  }
  const jumpTarget: string = ok ? tmp : "cv";
  router.push({ name: "firstTimeLoadingPage", query: { exhibition: "false", jumpTarget } });
}
</script>

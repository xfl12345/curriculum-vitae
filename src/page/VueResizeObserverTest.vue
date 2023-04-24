<template>
  <div ref="templateRoot" v-resize:[theSwitch]="onResize" class="resize">
    width: {{ width }}, height: {{ height }}
  </div>
</template>

<script setup lang="tsx">
import { computed, onMounted, ref } from "vue";

const templateRoot = ref<HTMLDivElement>();

const width = ref(0);
const height = ref(0);
const theSwitch = ref(false);

const onResize = (obj: any) => {
  console.log(obj);
  width.value = obj.width;
  height.value = obj.height;
};

onMounted(() => {
  width.value = templateRoot.value!.offsetWidth;
  height.value = templateRoot.value!.offsetHeight;
});
</script>

<style scoped>
.resize {
  background-color: orange;
  width: 300px;
  height: 300px;
  margin: 0 auto;
  resize: both;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>

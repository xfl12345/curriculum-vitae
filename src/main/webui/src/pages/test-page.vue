<script setup lang="ts">
import ConvertImgDataToDataUrlTestPage from '@/components/lab/blob_url/ConvertImgDataToDataUrlTestPage.vue'
import ConvertSvgElementToDataUrlTestPage from '@/components/lab/blob_url/ConvertSvgElementToDataUrlTestPage.vue'
</script>

<template>
  <ConvertSvgElementToDataUrlTestPage :class="$style.box" />
  <ConvertImgDataToDataUrlTestPage :class="[$style.box, $style.spacing]" />
</template>

<style lang="css" module>
.box {
  border: 1px dashed aqua;
  padding: 0.5em;
}

.spacing {
  margin-top: 2em;
}
</style>

<!--<template>-->
<!--  <div ref="templateRoot">-->
<!--    <div ref="sliderParentNode"></div>-->
<!--  </div>-->
<!--</template>-->

<!--<script lang="tsx">-->
<!--import { defineComponent, PropType, ref } from "vue";-->
<!--import noUiSlider, { API, Options, target } from "nouislider/src/nouislider";-->

<!--export default defineComponent({-->
<!--  props: {-->
<!--    sliderOptions: {-->
<!--      type: Object as PropType<Options>,-->
<!--      default: () => {-->
<!--        return {};-->
<!--      }-->
<!--    }-->
<!--  },-->
<!--  setup(props, ctx) {-->
<!--    const templateRoot = ref<HTMLDivElement>();-->
<!--    const sliderParentNode = ref<HTMLDivElement>();-->

<!--    return {-->
<!--      templateRoot,-->
<!--      sliderParentNode-->
<!--    };-->
<!--  },-->
<!--  data() {-->
<!--    const myself = this;-->
<!--    let sliderInstance: API | undefined;-->
<!--    return {-->
<!--      sliderInstance-->
<!--    };-->
<!--  },-->
<!--  computed: {},-->
<!--  watch: {-->
<!--    sliderOptions(newValue, oldValue) {-->
<!--      if (newValue !== oldValue) {-->
<!--        this.sliderInstance!.updateOptions(newValue, false);-->
<!--      }-->
<!--    }-->
<!--  },-->
<!--  beforeCreate() {},-->
<!--  created() {},-->
<!--  beforeMount() {},-->
<!--  mounted() {-->
<!--    const myself = this;-->
<!--    if (myself.sliderParentNode!.childNodes.length === 0) {-->
<!--      myself.sliderInstance = noUiSlider.create(-->
<!--        myself.sliderParentNode as HTMLDivElement,-->
<!--        myself.sliderOptions-->
<!--      );-->
<!--    }-->
<!--  },-->
<!--  beforeUpdate() {},-->
<!--  updated() {},-->
<!--  activated() {},-->
<!--  deactivated() {},-->
<!--  beforeUnmount() {-->
<!--    const myself = this;-->
<!--  },-->
<!--  unmounted() {-->
<!--    const myself = this;-->
<!--  },-->
<!--  methods: {}-->
<!--});-->
<!--</script>-->

<!--<style scoped lang="scss">-->
<!--@import "nouislider/dist/nouislider.css";-->
<!--</style>-->

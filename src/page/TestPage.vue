<template>
  <div ref="templateRoot">
    <captcha-box-type-rotate />
    <captcha-box-type-rotate
      :enable-result-feedback="true"
      :picture-width-in-pixel="400"
      :sizing-type="'content'"
    />
    <captcha-box-type-rotate :dom-box-width="900" />
  </div>
</template>

<script lang="tsx">
import { defineComponent, ref } from "vue";
import CaptchaBoxTypeRotate from "../components/tianai-captcha/vue/CaptchaBoxTypeRotate.vue";

export default defineComponent({
  components: { CaptchaBoxTypeRotate },
  props: {},
  emits: [],
  setup(props, ctx) {
    const templateRoot = ref<HTMLDivElement>();

    return {
      templateRoot
    };
  },
  data() {
    return {};
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

<template>
  <div ref="templateRoot">
    <div style="font-size: 60px">
      <input ref="theInput" v-model="theInputValue" style="font-size: inherit; width: 100%" /><br />
      <div>
        二进制值：<span style="border: 1px hotpink solid; word-wrap: break-word">{{ theBinString }}</span>
      </div>
    </div>
    <br />
    <br />

    <captcha-box-type-rotate
      :tianai-captcha-client="new XFLsCvCaptchaClient()"
      :enable-result-feedback="true"
    />
    <captcha-box-type-rotate
      :tianai-captcha-client="new XFLsCvCaptchaClient()"
      :enable-result-feedback="true"
      :picture-width-in-pixel="400"
      :sizing-type="'content'"
    />
    <captcha-box-type-rotate
      :tianai-captcha-client="new XFLsCvCaptchaClient()"
      :dom-box-width="900"
      :enable-result-feedback="true"
    />
  </div>
</template>

<script lang="tsx">
import { defineComponent, ref } from "vue";
import CaptchaBoxTypeRotate from "../components/tianai-captcha/vue/CaptchaBoxTypeRotate.vue";
import { XFLsCvCaptchaClient } from "../model/XFLsCvCaptchaClient";

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
    return {
      theInputValue: ""
    };
  },
  computed: {
    XFLsCvCaptchaClient() {
      return XFLsCvCaptchaClient;
    },
    theBinString() {
      const stringList: string[] = [];
      if (this.theInputValue !== "") {
        for (let i = 0; i < this.theInputValue.length; i += 1) {
          const binString = parseInt(this.theInputValue[i], 16).toString(2);
          stringList.push("0000".slice(binString.length) + binString);
        }
      }

      return stringList.join("");
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
  methods: {}
});
</script>

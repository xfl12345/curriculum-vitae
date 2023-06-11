<template>
  <div ref="templateRoot">
    <div style="font-size: 60px">
      <input
        ref="theInput"
        v-model="theInputValue"
        style="border: aqua dashed 1px; font-size: inherit; width: 100%"
      /><br />
      <div>
        二进制值：<span style="border: 1px hotpink solid; word-wrap: break-word">{{ theBinString }}</span>
      </div>
    </div>
    <br />
    <br />
    <button @click="startWsTest">开始WS通信</button>
    <span>短信内容：</span><br />
    <div style="border: aqua solid 1px; white-space: pre-wrap">{{ smsContent }}</div>
  </div>
</template>

<script lang="tsx">
import { defineComponent, ref } from "vue";
import axios, { AxiosResponse } from "axios";
import ReconnectingWebSocket from "reconnecting-websocket";
import * as Events from "reconnecting-websocket/events";

export default defineComponent({
  components: {},
  props: {},
  emits: [],
  setup(props, ctx) {
    const templateRoot = ref<HTMLDivElement>();

    return {
      templateRoot
    };
  },
  data() {
    const webSocketClient: any = null;
    return {
      theInputValue: "" as string,
      smsContent: "",
      webSocketClient
    };
  },
  computed: {
    theBinString() {
      const myself = this;
      const stringList: string[] = [];
      if (myself.theInputValue !== "") {
        for (let i = 0; i < myself.theInputValue.length; i += 1) {
          const binString = parseInt(myself.theInputValue[i], 16).toString(2);
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
  methods: {
    startWsTest() {
      const myself = this;
      axios
        .post(
          "./sms/ws-login",
          {
            accessKeySecret: "just-test_https://github.com/xfl12345/java-curriculum-vitae-server-web"
          },
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            }
          }
        )
        .then(
          (axiosResponse: AxiosResponse) => {
            console.log(axiosResponse);
            if (axiosResponse.data.success) {
              const loginToken = axiosResponse.data.data.saToken;
              console.log("websocket auth. LoginToken=" + loginToken);

              const url = new URL("./sms/ws-connect", window.location.href);
              url.protocol = url.protocol.toLowerCase() === "http:" ? "ws:" : "wss:";
              const webSocketClient = new ReconnectingWebSocket(url.toString());
              myself.webSocketClient = webSocketClient;
              console.log("websocket connected.");

              webSocketClient.addEventListener("message", (event: MessageEvent) => {
                myself.smsContent = event.data;

                event.preventDefault();
              });

              webSocketClient.addEventListener("error", (event: Events.ErrorEvent) => {
                webSocketClient.close();
                myself.startWsTest();
              });
            } else {
              setTimeout(() => {
                myself.startWsTest();
              }, 2000);
            }
          },
          (reason) => {
            setTimeout(() => {
              myself.startWsTest();
            }, 2000);
          }
        );
    }
  }
});
</script>

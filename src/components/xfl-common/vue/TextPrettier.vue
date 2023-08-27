<script lang="tsx">
import type { VNodeProps, PropType, VNode } from "vue";
import { defineComponent, h } from "vue";
import isChinese from "is-chinese";
import { VuePartialCssProperties } from "@/components/xfl-common/ts/VuePartialCssProperties";

export default defineComponent({
  // name: "TextPrettier",
  props: {
    content: {
      type: String,
      default: ""
    },
    propsCssStyle: {
      type: Object as PropType<VuePartialCssProperties>,
      default: (): VuePartialCssProperties => {
        return {
          fontSize: "inherit"
        };
      }
    }
  },
  setup(props, ctx) {},
  data() {
    return {
      myValueBox: h("span")
    };
  },
  computed: {
    theChineseContentStyle() {
      return this.propsCssStyle;
    },
    theDefaultContentStyle() {
      const myself = this;
      const theStyle = { ...myself.propsCssStyle };
      if (typeof myself.propsCssStyle.fontFamily === "undefined") {
        theStyle.fontFamily = "Consolas, serif";
      }

      return theStyle;
    }
  },
  watch: {
    content(newValue, oldValue) {
      if (newValue !== oldValue) {
        this.myValueBox = this.recreateTheValueBoxVnode();
      }
    }
  },
  created() {
    this.myValueBox = this.recreateTheValueBoxVnode();
  },
  mounted() {
    // const myself = this;
    // if (myself.content?.startsWith("176")) {
    //   window.ttt = myself;
    // }
  },
  methods: {
    isChineseCharacter(character: string) {
      // return characterUnicode >= 0x4e00 && characterUnicode <= 0x9fa5;
      return isChinese(character);
    },
    initVnodeProps(vnode: VNode) {
      if (typeof vnode.props === "undefined" || vnode.props === null) {
        vnode.props = {} as VNodeProps;
      }
    },
    recreateTheValueBoxVnode() {
      return h("span", this.generateChildrenVnode());
    },
    generateChildrenVnode() {
      const myself = this;
      // const vueData = myself!.data;

      const theInputValue = myself.content;
      const itemCount = theInputValue!.length;
      const theChildrenVnode: VNode[] = [];

      let isPreviousCharacterChinese: Boolean = false;
      let currentCharacter;
      let currentPhase: string[] = [];

      const pushNewSpanElement = () => {
        const finalInnerText = currentPhase.join("");
        const spanTagVnode = <span>{finalInnerText}</span>;
        if (spanTagVnode.props === null) {
          spanTagVnode.props = {} as VNodeProps;
        }

        // 因为检测到字体语种的不同，所以触发了样式切换。
        // 等待被压入节点群的节点，已经是过去式了。如果这个节点是中文的，将使用中文样式。
        spanTagVnode.props.style = isPreviousCharacterChinese
          ? myself.theChineseContentStyle
          : myself.theDefaultContentStyle;

        theChildrenVnode.push(spanTagVnode);
      };

      if (itemCount > 0) {
        currentCharacter = theInputValue!.charAt(0);
        isPreviousCharacterChinese = myself.isChineseCharacter(currentCharacter);

        currentPhase.push(currentCharacter);

        // 如果相邻字符是同个字体分类，那么便挤在一起，不分家（大家都在同一个 span 元素里）
        for (let i = 1; i < itemCount; i += 1) {
          currentCharacter = theInputValue!.charAt(i);
          const isCurrentCharacterChinese = myself.isChineseCharacter(currentCharacter);

          if (isPreviousCharacterChinese !== isCurrentCharacterChinese) {
            pushNewSpanElement();
            currentPhase = [];
          }

          isPreviousCharacterChinese = isCurrentCharacterChinese;
          currentPhase.push(currentCharacter);
        }

        pushNewSpanElement();
      }

      return theChildrenVnode;
    }
  },
  render() {
    return this.myValueBox;
    // return <div />;
  }
});
</script>

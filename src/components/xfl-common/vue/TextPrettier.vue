<script lang="tsx">
import { defineComponent, getCurrentInstance, h, VNode } from "vue";
import isChinese from "is-chinese";

export default defineComponent({
  // name: "TextPrettier",
  props: {
    content: {
      type: String,
      default: ""
    }
  },
  setup(props, ctx) {
    const isChineseCharacter = (character: string): Boolean => {
      // return characterUnicode >= 0x4e00 && characterUnicode <= 0x9fa5;
      return isChinese(character);
    };

    const generateChildrenVnode = () => {
      const myself = getCurrentInstance();
      // const vueData = myself!.data;

      const theInputValue = props.content;
      const itemCount = theInputValue!.length;
      const theChildrenVnode: VNode[] = [];

      let isPreviousCharacterChinese: Boolean = false;
      let currentCharacter;
      let currentPhase: string[] = [];

      const pushNewSpanElement = () => {
        const finalInnerText = currentPhase.join("");
        const spanTagVnode = isPreviousCharacterChinese ? (
          <span>{finalInnerText}</span>
        ) : (
          <span style={{ fontFamily: "Consolas, serif" }}>{finalInnerText}</span>
        );

        theChildrenVnode.push(spanTagVnode);
      };

      if (itemCount > 0) {
        currentCharacter = theInputValue!.charAt(0);
        isPreviousCharacterChinese = isChineseCharacter(currentCharacter);

        currentPhase.push(currentCharacter);

        // 如果相邻字符是同个字体分类，那么便挤在一起，不分家（大家都在同一个 span 元素里）
        for (let i = 1; i < itemCount; i += 1) {
          currentCharacter = theInputValue!.charAt(i);
          const isCurrentCharacterChinese = isChineseCharacter(currentCharacter);

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
    };

    return { isChineseCharacter, generateChildrenVnode };
  },
  data() {
    return {
      myValueBox: h("div")
    };
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
    recreateTheValueBoxVnode() {
      return h("div", this.generateChildrenVnode());
    }
  },
  render() {
    return this.myValueBox;
    // return <div />;
  }
});
</script>

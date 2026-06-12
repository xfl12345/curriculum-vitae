import { useElementSize, useMutationObserver } from '@vueuse/core'
import { computed, ref, type Ref } from 'vue'

export class VxeTableReact {
  headerElementRef = ref<HTMLElement | null>(null)
  headerElement = computed<HTMLElement | null>(() => this.headerElementRef.value)
  bodyElementRef = ref<HTMLElement | null>(null)
  bodyElement = computed<HTMLElement | null>(() => this.bodyElementRef.value)
  headerElementSize
  bodyElementSize
  constructor(protected gridElement: Ref<HTMLElement | undefined | null>) {
    // 因为 computed 是惰性求值，而声明期的 gridElement 是空值
    // 所以必须把 size 响应式字段放在构造器里初始化，避免空值访问
    this.headerElementSize = useElementSize(this.headerElement)
    this.bodyElementSize = useElementSize(this.bodyElement)

    const { stop } = useMutationObserver(
      gridElement,
      (mutations) => {
        // console.log(mutations)
        if (mutations.at(0)) {
          if (!this.headerElementRef.value) {
            this.headerElementRef.value = this.gridElement.value
              ?.getElementsByClassName('vxe-table--header-wrapper')
              .item(0) as HTMLElement | null
          }
          if (!this.bodyElementRef.value) {
            this.bodyElementRef.value = this.gridElement.value
              ?.getElementsByClassName('vxe-table--body-wrapper')
              .item(0) as HTMLElement | null
          }

          if (this.headerElementRef && this.bodyElementRef) {
            console.info('[VxeTableReact] 所有元素已找到')
            stop()
          }
        }
      },
      {
        attributes: false,
        characterData: false,
        characterDataOldValue: false,
        childList: true,
        subtree: true,
      }
    )
  }
}

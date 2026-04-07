<script setup lang="ts">
import type { Props } from './types'

withDefaults(defineProps<Props>(), {
  xGrow: '0',
  xBasis: 'auto',
  xShrink: '1',
  yGrow: '0',
  yBasis: 'auto',
  yShrink: '1',
})
</script>

<template>
  <div :class="$style.outer">
    <div :class="$style.columnBox">
      <div :class="$style.rowBox">
        <slot />
      </div>
    </div>
  </div>
</template>

<style module>
.outer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  justify-content: center;
}

.columnBox {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex-grow: v-bind(xGrow);
  flex-shrink: v-bind(xShrink);
  flex-basis: v-bind(xBasis);
}

.rowBox {
  background-color: transparent;
  flex-grow: v-bind(yGrow);
  flex-shrink: v-bind(yShrink);
  flex-basis: v-bind(yBasis);
}
</style>

<script setup lang="ts">
/**
 * 三个 vxe-table 实现共享的工具栏：「新增 / 删除选中 / 保存」按钮 + 配套样式。
 * 默认插槽放在按钮右侧，给状态行（如「已加载 N 条」）或额外按钮（如 InfinitePlainImpl
 * 的「加载第 N 页」）用。按钮样式 + slot 内 button 的统一样式都在这里维护。
 */
defineEmits<{
  insert: []
  delete: []
  save: []
}>()
</script>

<template>
  <div :class="$style.toolbar">
    <button type="button" :class="$style.btnSuccess" @click="$emit('insert')">新增</button>
    <button type="button" :class="$style.btnDanger" @click="$emit('delete')">删除选中</button>
    <button type="button" :class="$style.btnPrimary" @click="$emit('save')">保存</button>
    <slot />
  </div>
</template>

<style module>
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

/* toolbar 内所有 button（含 slot 里调用方加的）统一基础样式 */
.toolbar button {
  padding: 6px 16px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  cursor: pointer;
  font-size: 14px;
}

.toolbar button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btnPrimary {
  color: #fff;
  background-color: #409eff;
  border-color: #409eff;
}

.btnSuccess {
  color: #fff;
  background-color: #67c23a;
  border-color: #67c23a;
}

.btnDanger {
  color: #fff;
  background-color: #f56c6c;
  border-color: #f56c6c;
}
</style>

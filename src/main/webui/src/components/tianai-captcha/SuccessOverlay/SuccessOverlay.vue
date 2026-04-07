<script setup lang="ts">
import type { Props } from './types'

defineProps<Props>()
</script>

<template>
  <div :class="$style.overlay">
    <svg :class="$style.checkmark" viewBox="0 0 52 52">
      <circle :class="$style.circle" cx="26" cy="26" r="25" fill="none" />
      <path :class="$style.check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
    </svg>
    <span :class="$style.text">验证通过</span>
  </div>
</template>

<style module>
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8%;
  background-color: rgba(255, 255, 255, 0.75);
  animation: fadeOut 300ms ease-in v-bind(fadeOutDelay) forwards;
}

.checkmark {
  width: 40%;
  aspect-ratio: 1;
  animation: enter 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.circle {
  stroke: #4caf50;
  stroke-width: 2;
  stroke-dasharray: 157;
  stroke-dashoffset: 157;
  animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}

.check {
  stroke: #4caf50;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.5s forwards;
}

.text {
  color: #4caf50;
  font-size: v-bind(fontSize);
  font-weight: bold;
  opacity: 0;
  animation: fadeIn 0.3s ease-out 0.6s forwards;
}

@keyframes fadeOut {
  to {
    opacity: 0;
  }
}

@keyframes enter {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes stroke {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}
</style>

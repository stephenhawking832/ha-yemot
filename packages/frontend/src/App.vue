<script setup lang="ts">
import LanguageToggle from './components/LanguageToggle.vue';
</script>

<template>
  <div class="app-container">
    <div class="top-center">
      <LanguageToggle />
    </div>

    <router-view />
  </div>
</template>

<style>
.app-container {
  min-height: 100vh;
}

.top-center {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
}
</style>
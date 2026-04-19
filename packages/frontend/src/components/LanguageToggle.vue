<template>
  <div class="toggle">
    <button
      class="flag"
      :class="{ active: locale === 'en' }"
      @click="setLang('en')"
      aria-label="English"
    >
      🇺🇸
    </button>

    <button
      class="flag"
      :class="{ active: locale === 'he' }"
      @click="setLang('he')"
      aria-label="עברית"
    >
      🇮🇱
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();

function setLang(lang: 'en' | 'he') {
  locale.value = lang;

  // RTL switch
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';

  // Optional persistence
  localStorage.setItem('lang', lang);
}
</script>

<style scoped>
.toggle {
  display: flex;
  gap: 10px;
  background: #f3f3f3;
  padding: 6px 10px;
  border-radius: 30px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.flag {
  font-size: 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.5;
  transition: transform 0.2s, opacity 0.2s;
}

.flag:hover {
  transform: scale(1.2);
}

.flag.active {
  opacity: 1;
  transform: scale(1.2);
}
</style>
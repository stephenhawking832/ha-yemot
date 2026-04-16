<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';

const { t } = useI18n();
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
    <!-- Tailwind CSS Test -->
    <h1 class="text-3xl font-bold text-slate-800">
      {{ t('app.title') }}
    </h1>
    
    <!-- PrimeVue v4 & PrimeIcons Test -->
    <Button icon="pi pi-cog" :label="t('app.settings')" severity="primary" />
  </div>
</template>
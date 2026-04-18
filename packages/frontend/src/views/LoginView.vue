<!-- packages/frontend/src/views/LoginView.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/auth';
import { useI18n } from 'vue-i18n';

// PrimeVue Components
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Message from 'primevue/message';

const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();

const username = ref('');
const password = ref('');
const errorMsg = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
  errorMsg.value = '';
  isLoading.value = true;
  
  try {
    await authStore.login(username.value, password.value);
    // Success! Redirect to the dashboard
    router.push({ name: 'Dashboard' });
  } catch (err: any) {
    errorMsg.value = err.message || 'Login failed';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <Card class="w-full max-w-md shadow-lg border border-slate-200">
      <template #title>
        <div class="text-center text-2xl font-bold text-slate-800">
          {{ t('app.title') }}
        </div>
      </template>
      
      <template #content>
        <form @submit.prevent="handleLogin" class="flex flex-col gap-4 mt-4">
          
          <Message v-if="errorMsg" severity="error" :closable="false">{{ errorMsg }}</Message>

          <div class="flex flex-col gap-2">
            <label for="username" class="font-semibold text-slate-700">{{ t('auth.username') }}</label>
            <InputText id="username" v-model="username" required autocomplete="username" />
          </div>

          <div class="flex flex-col gap-2">
            <label for="password" class="font-semibold text-slate-700">{{ t('auth.password') }}</label>
            <InputText id="password" type="password" v-model="password" required autocomplete="current-password" />
          </div>

          <Button 
            type="submit" 
            :label="t('auth.login')" 
            :loading="isLoading" 
            class="mt-2"
          />
        </form>
      </template>
    </Card>
  </div>
</template>
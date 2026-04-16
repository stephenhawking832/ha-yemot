<!-- packages/frontend/src/views/DashboardLayout.vue -->
<script setup lang="ts">
import { useAuthStore } from '../store/auth';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';

const authStore = useAuthStore();
const router = useRouter();

const logout = () => {
  authStore.logout();
  router.push('/login');
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-100">
    <!-- TOP BAR -->
    <header class="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm">
      <h1 class="text-xl font-bold text-slate-800">HA IVR Driver</h1>
      <div class="flex items-center gap-4">
        <!-- We will put the HA connection status and settings gear here later! -->
        <Button icon="pi pi-sign-out" label="Logout" text severity="secondary" @click="logout" />
      </div>
    </header>

    <!-- MAIN CONTENT AREA -->
    <main class="flex-1 p-6 overflow-hidden">
      <router-view />
    </main>
  </div>
</template>
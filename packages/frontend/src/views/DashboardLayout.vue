<!-- packages/frontend/src/views/DashboardLayout.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../store/auth';
import { useIvrStore } from '../store/ivr';
import { useRouter } from 'vue-router';

// Components
import Button from 'primevue/button';
import SettingsModal from '../components/SettingsModal.vue';

const authStore = useAuthStore();
const ivrStore = useIvrStore();
const router = useRouter();

const showSettings = ref(false);

// Load the configuration from the backend as soon as the Dashboard loads!
onMounted(async () => {
  await ivrStore.loadConfig();
  // We can also load the HA entities in the background so the dropdowns are ready
  await ivrStore.loadEntities();
});

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
      <div class="flex items-center gap-2">
        <!-- Optional: Connection Status Indicator -->
        <div class="px-3 py-1 rounded-full text-xs font-bold border" 
             :class="ivrStore.entities.length > 0 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'">
          <i class="pi pi-home mr-1 text-xs"></i> 
          {{ ivrStore.entities.length > 0 ? 'HA Connected' : 'HA Offline' }}
        </div>
        
        <!-- Settings Gear -->
        <Button icon="pi pi-cog" text rounded severity="secondary" @click="showSettings = true" aria-label="Settings" />
        
        <!-- Logout -->
        <Button icon="pi pi-sign-out" label="Logout" text severity="secondary" @click="logout" />
      </div>
    </header>

    <!-- MAIN CONTENT AREA -->
    <main class="flex-1 p-6 overflow-hidden">
      <router-view />
    </main>
  </div>
  <!-- Settings Modal -->
    <SettingsModal :visible="showSettings" @update:visible="showSettings = $event" />
</template>
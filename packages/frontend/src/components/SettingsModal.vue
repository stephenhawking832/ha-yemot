<!-- packages/frontend/src/components/SettingsModal.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue';
import { useIvrStore } from '../store/ivr';
import { useI18n } from 'vue-i18n';
// PrimeVue Components
import Dialog from 'primevue/dialog';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Chips from 'primevue/chips';
import Message from 'primevue/message';

const { t } = useI18n();

// Props to control visibility from parent
const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits(['update:visible']);

const ivrStore = useIvrStore();

// --- Local State for HA Settings ---
const haHost = ref('');
const haToken = ref('');

// Sync local state when modal opens
watch(() => props.visible, (isOpen) => {
  if (isOpen && ivrStore.config) {
    haHost.value = ivrStore.config.host;
    haToken.value = ivrStore.config.token;
  }
});

const saveHaSettings = async () => {
  if (!ivrStore.config) return;
  
  ivrStore.config.host = haHost.value;
  ivrStore.config.token = haToken.value;
  
  await ivrStore.saveConfig();
  alert('Home Assistant settings saved! (Restart backend to apply connection changes)');
};

// --- Local State for Security Settings ---
const newApiKey = ref('');
const apiWarning = ref('');
const allowedPhones = ref<string[]>([]);

watch(() => props.visible, (isOpen) => {
  if (isOpen && ivrStore.config) {
    // Use optional chaining and provide an empty array as a fallback
    allowedPhones.value = ivrStore.security?.allowedPhones ? [...ivrStore.security.allowedPhones] : [];
  }
});

const handleGenerateKey = async () => {
  if (!confirm('Are you sure? Generating a new key will instantly break your current Yemot webhook connection.')) return;
  
  try {
    const res = await ivrStore.generateApiKey();
    newApiKey.value = res.newApiKey;
    apiWarning.value = res.warning;
  } catch (e: any) {
    alert(e.message);
  }
};

const savePhoneWhitelist = async () => {
  try {
    await ivrStore.updateAllowedPhones(allowedPhones.value);
    alert('Whitelist updated successfully.');
  } catch (e: any) {
    alert(e.message);
  }
};
</script>

<template>
  <Dialog 
    :visible="props.visible" 
    @update:visible="emit('update:visible', $event)" 
    modal 
    :header="t('settings.title')"
    :style="{ width: '40rem' }"
  >
    <!-- We only show settings if config is loaded -->
    <div v-if="!ivrStore.config" class="p-4 text-center">{{ t('settings.loading') }}</div>
    
    <Tabs v-else value="0">
      <TabList>
        <Tab value="0"><i class="pi pi-home mr-2"></i>{{ t('settings.ha_tab_title') }}</Tab>
        <Tab value="1"><i class="pi pi-lock mr-2"></i>{{ t('settings.security_tab_title') }}</Tab>
      </TabList>
      
      <TabPanels>
        <!-- Home Assistant Tab -->
        <TabPanel value="0">
          <div class="flex flex-col gap-4 py-2">
            <div class="flex flex-col gap-2">
              <label class="font-semibold text-slate-700">{{ t('settings.url_title') }}</label>
              <InputText v-model="haHost" placeholder="http://homeassistant.local:8123" />
            </div>
            
            <div class="flex flex-col gap-2">
              <label class="font-semibold text-slate-700">{{ t('settings.ha_token_title') }}</label>
              <!-- Using Password component so token is hidden by default -->
              <Password v-model="haToken" :feedback="false" toggleMask fluid />
            </div>
            
            <Button :label="t('settings.save_button')" icon="pi pi-save" @click="saveHaSettings" class="mt-2 self-start" />
          </div>
        </TabPanel>

        <!-- Security Tab -->
        <TabPanel value="1">
          <div class="flex flex-col gap-6 py-2">
            
            <!-- API Key Section -->
            <div class="border border-slate-200 rounded-lg p-4 bg-slate-50 flex flex-col gap-3">
              <h3 class="font-bold text-slate-800">{{ t('settings.api_key_title') }}</h3>
              <p class="text-sm text-slate-600">
                This key is required by Yemot to authenticate with this driver.
              </p>
              
              <Message v-if="newApiKey" severity="warn" :closable="false">
                <div class="font-bold mb-1">{{ apiWarning }}</div>
                <div class="font-mono bg-white p-2 border border-orange-200 rounded select-all break-all text-black">
                  {{ newApiKey }}
                </div>
              </Message>

              <Button 
                :label="t('settings.api_key_button')" 
                icon="pi pi-key" 
                severity="danger" 
                outlined 
                @click="handleGenerateKey" 
                class="self-start" 
              />
            </div>

            <!-- Whitelist Section -->
            <div class="border border-slate-200 rounded-lg p-4 bg-slate-50 flex flex-col gap-3">
              <h3 class="font-bold text-slate-800">{{ t('settings.phonos_title') }}</h3>
              <p class="text-sm text-slate-600">
                {{ t('settings.phonos_text') }}
              </p>
              
              <Chips v-model="allowedPhones" separator="," placeholder="0501234567" fluid />
              
              <Button :label="t('settings.phonos_button')" icon="pi pi-save" @click="savePhoneWhitelist" class="self-start mt-2" />
            </div>

          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </Dialog>
</template>
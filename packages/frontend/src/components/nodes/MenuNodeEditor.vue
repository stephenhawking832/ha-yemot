<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useIvrStore } from '../../store/ivr';
import type { MenuNode } from '@ha-yemot/shared';

// PrimeVue
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Divider from 'primevue/divider';

const { t } = useI18n();
const ivrStore = useIvrStore();

// defineModel automatically syncs with v-model in the parent
const model = defineModel<MenuNode>({ required: true });

// Convert the flat nodes dictionary into an array for the Select dropdown
const availableNodes = computed(() => {
  if (!ivrStore.config) return [];
  return Object.values(ivrStore.config.nodes).filter(n => n.id !== model.value.id); // Prevent self-linking
});

// Helper to add a new empty choice row
const newDtmf = ref('');
const addChoice = () => {
  if (!newDtmf.value) return;
  model.value.choices[newDtmf.value] = '';
  newDtmf.value = '';
};

// Helper to remove a choice
const removeChoice = (key: string) => {
  delete model.value.choices[key];
};
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Common Gathering Fields -->
    <div class="flex flex-col gap-1">
      <label class="text-xs font-bold text-slate-500 uppercase">{{ t('nodes.common.tts_prompt') }}</label>
      <InputText v-model="model.ttsPrompt" />
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-xs font-bold text-slate-500 uppercase">{{ t('nodes.common.val_name') }}</label>
      <InputText v-model="model.valName" />
    </div>

    <Divider />

    <!-- Choices Map -->
    <div class="flex flex-col gap-2">
      <label class="text-xs font-bold text-slate-500 uppercase">{{ t('nodes.menu.choices') }}</label>
      
      <div v-for="(nextNodeId, dtmf) in model.choices" :key="dtmf" class="flex items-center gap-2 mb-2">
        <!-- The Key -->
        <div class="w-16">
          <InputText :model-value="String(dtmf)" disabled class="w-full text-center font-bold" />
        </div>
        <i class="pi pi-arrow-right text-slate-400 text-sm"></i>
        <!-- The Target Node -->
        <Select 
          v-model="model.choices[dtmf]" 
          :options="availableNodes" 
          optionLabel="name" 
          optionValue="id" 
          :placeholder="t('nodes.menu.target_node')" 
          class="flex-1"
        />
        <!-- Delete Button -->
        <Button icon="pi pi-trash" severity="danger" text rounded @click="removeChoice(String(dtmf))" />
      </div>

      <!-- Add New Row -->
      <div class="flex items-center gap-2 mt-2 bg-slate-50 p-2 border border-slate-200 rounded">
        <InputText v-model="newDtmf" :placeholder="t('nodes.common.dtmf_key')" class="w-24" @keyup.enter="addChoice" />
        <Button :label="t('nodes.common.add_row')" icon="pi pi-plus" size="small" @click="addChoice" :disabled="!newDtmf" />
      </div>
    </div>
  </div>
</template>
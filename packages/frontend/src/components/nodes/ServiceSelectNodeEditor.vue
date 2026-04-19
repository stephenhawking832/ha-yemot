<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useIvrStore } from '../../store/ivr';
import type { ServiceSelectNode } from '@ha-yemot/shared';

import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Divider from 'primevue/divider';

const { t } = useI18n();
const ivrStore = useIvrStore();
const model = defineModel<ServiceSelectNode>({ required: true });

const availableNodes = computed(() => {
  if (!ivrStore.config) return [];
  return Object.values(ivrStore.config.nodes).filter(n => n.id !== model.value.id);
});

// A list of common HA actions to populate the dropdown, but users can type their own
const commonActions = [
  'homeassistant.turn_on',
  'homeassistant.turn_off',
  'homeassistant.toggle',
  'climate.set_temperature',
  'climate.set_hvac_mode',
  'light.turn_on',
  'cover.open_cover',
  'cover.close_cover',
  'script.turn_on'
];

const newDtmf = ref('');
const addActionMapping = () => {
  if (!newDtmf.value) return;
  // Initialize the nested object for this DTMF key
  model.value.choices[newDtmf.value] = { service: '', nextNodeId: '' };
  newDtmf.value = '';
};

const removeActionMapping = (key: string) => {
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

    <!-- The two variable names required for State Architecture -->
    <div class="flex gap-4">
      <div class="flex flex-col gap-1 flex-1">
        <label class="text-xs font-bold text-slate-500 uppercase">{{ t('nodes.common.val_name') }}</label>
        <InputText v-model="model.valName" />
      </div>
      <div class="flex flex-col gap-1 flex-1">
        <label class="text-xs font-bold text-slate-500 uppercase">{{ t('nodes.common.variable_name') }}</label>
        <InputText v-model="model.variableName" />
      </div>
    </div>

    <Divider />

    <!-- Action Map & Routing -->
    <div class="flex flex-col gap-2">
      <label class="text-xs font-bold text-slate-500 uppercase">{{ t('nodes.service_select.action_map') }}</label>
      
      <div v-for="(choiceData, dtmf) in model.choices" :key="dtmf" class="flex flex-col gap-2 mb-4 p-3 bg-slate-50 border border-slate-200 rounded">
        
        <div class="flex items-center gap-2">
          <div class="w-16">
            <InputText :model-value="String(dtmf)" disabled class="w-full text-center font-bold" />
          </div>
          <i class="pi pi-arrow-right text-slate-400 text-sm rtl-flip"></i>
          
          <!-- Editable Dropdown (Combo Box) for HA Service -->
          <!-- We use editable=true so they can type "custom_domain.service" if they want -->
          <Select 
            v-model="model.choices[dtmf].service" 
            :options="commonActions" 
            editable 
            :placeholder="t('nodes.service_select.ha_action_string')" 
            class="flex-1"
          />
          <Button icon="pi pi-trash" severity="danger" text rounded @click="removeActionMapping(String(dtmf))" />
        </div>

        <div class="flex items-center gap-2 pl-[4.5rem]">
          <i class="pi pi-link text-slate-400 text-sm"></i>
          <Select 
            v-model="model.choices[dtmf].nextNodeId" 
            :options="availableNodes" 
            optionLabel="name" 
            optionValue="id" 
            :placeholder="t('nodes.menu.target_node')" 
            class="flex-1"
          />
        </div>
      </div>

      <!-- Add New Row -->
      <div class="flex items-center gap-2 mt-2 p-2 border border-slate-200 rounded bg-white">
        <InputText v-model="newDtmf" :placeholder="t('nodes.common.dtmf_key')" class="w-24" @keyup.enter="addActionMapping" />
        <Button :label="t('nodes.common.add_row')" icon="pi pi-plus" size="small" @click="addActionMapping" :disabled="!newDtmf" />
      </div>
    </div>
  </div>
</template>
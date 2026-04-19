<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useIvrStore } from '../../store/ivr';
import type { TargetNode } from '@ha-yemot/shared';

import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Divider from 'primevue/divider';

const { t } = useI18n();
const ivrStore = useIvrStore();
const model = defineModel<TargetNode>({ required: true });

const availableNodes = computed(() => {
  if (!ivrStore.config) return [];
  return Object.values(ivrStore.config.nodes).filter(n => n.id !== model.value.id);
});

// Group entities by domain for the PrimeVue Select component
const groupedEntities = computed(() => {
  const domains = new Set(ivrStore.entities.map(e => e.domain));
  return Array.from(domains).map(domain => {
    return {
      label: domain.toUpperCase(),
      items: ivrStore.entities.filter(e => e.domain === domain)
    };
  });
});

const newDtmf = ref('');
const addEntityMapping = () => {
  if (!newDtmf.value) return;
  model.value.entityMap[newDtmf.value] = '';
  newDtmf.value = '';
};

const removeEntityMapping = (key: string) => {
  delete model.value.entityMap[key];
};
</script>

<template>
  <div class="flex flex-col gap-4">
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

    <div class="flex flex-col gap-1">
      <label class="text-xs font-bold text-slate-500 uppercase">{{ t('nodes.target.max_digits') }}</label>
      <InputNumber v-model="model.maxDigits" :min="1" :max="50" class="w-full" />
    </div>

    <Divider />

    <!-- Entity Map -->
    <div class="flex flex-col gap-2">
      <label class="text-xs font-bold text-slate-500 uppercase">{{ t('nodes.target.entity_map') }}</label>
      
      <div v-for="(_, dtmf) in model.entityMap" :key="dtmf" class="flex items-center gap-2 mb-2">
        <div class="w-16">
          <InputText :model-value="String(dtmf)" disabled class="w-full text-center font-bold" />
        </div>
        <i class="pi pi-arrow-right text-slate-400 text-sm rtl-flip"></i>
        <!-- Rich Dropdown showing friendly names, but saving entity_id -->
        <Select 
          v-model="model.entityMap[dtmf]" 
          :options="groupedEntities" 
          optionLabel="friendly_name" 
          optionValue="entity_id" 
          optionGroupLabel="label" 
          optionGroupChildren="items"
          filter
          :placeholder="t('nodes.target.select_entity')" 
          class="flex-1"
        >
          <template #option="slotProps">
            <div class="flex items-center">
              <span>{{ slotProps.option.friendly_name }}</span>
              <span class="ml-2 text-xs text-slate-400">({{ slotProps.option.entity_id }})</span>
            </div>
          </template>
        </Select>
        <Button icon="pi pi-trash" severity="danger" text rounded @click="removeEntityMapping(String(dtmf))" />
      </div>

      <div class="flex items-center gap-2 mt-2 bg-slate-50 p-2 border border-slate-200 rounded">
        <InputText v-model="newDtmf" :placeholder="t('nodes.common.dtmf_key')" class="w-24" @keyup.enter="addEntityMapping" />
        <Button :label="t('nodes.common.add_row')" icon="pi pi-plus" size="small" @click="addEntityMapping" :disabled="!newDtmf" />
      </div>
    </div>

    <Divider />

    <!-- Next Node -->
    <div class="flex flex-col gap-1">
      <label class="text-xs font-bold text-slate-500 uppercase">{{ t('nodes.common.next_node') }}</label>
      <Select 
        v-model="model.nextNodeId" 
        :options="availableNodes" 
        optionLabel="name" 
        optionValue="id" 
        class="w-full"
      />
    </div>
  </div>
</template>
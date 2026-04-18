<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useIvrStore } from '../../store/ivr';
import type { ReadNode } from '@ha-yemot/shared';

import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import RadioButton from 'primevue/radiobutton';
import Divider from 'primevue/divider';

const { t } = useI18n();
const ivrStore = useIvrStore();
const model = defineModel<ReadNode>({ required: true });

const targetVariables = computed(() => {
  if (!ivrStore.config) return [];
  return Object.values(ivrStore.config.nodes)
    .filter(n => n.type === 'target')
    // @ts-ignore
    .map(n => n.variableName);
});

// Group entities for hardcoded selection
const groupedEntities = computed(() => {
  const domains = new Set(ivrStore.entities.map(e => e.domain));
  return Array.from(domains).map(domain => {
    return {
      label: domain.toUpperCase(),
      items: ivrStore.entities.filter(e => e.domain === domain)
    };
  });
});

const availableNodes = computed(() => {
  if (!ivrStore.config) return [];
  const nodes = Object.values(ivrStore.config.nodes).filter(n => n.id !== model.value.id);
  return [{ id: '', name: '-- Hang Up Call --' }, ...nodes];
});

const targetType = ref(model.value.targetVariableName ? 'dynamic' : 'hardcoded');
</script>

<template>
  <div class="flex flex-col gap-4">
    
    <!-- ENTITY SELECTION -->
    <div class="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded">
      <label class="text-xs font-bold text-slate-500 uppercase">{{ t('nodes.read.target_type') }}</label>
      
      <div class="flex items-center gap-2 mt-2">
        <RadioButton v-model="targetType" inputId="rt1" value="dynamic" />
        <label for="rt1" class="text-sm cursor-pointer">{{ t('nodes.read.dynamic_target') }}</label>
      </div>
      <Select 
        v-if="targetType === 'dynamic'"
        v-model="model.targetVariableName" 
        :options="targetVariables" 
        editable
        placeholder="Select target variable" 
        class="w-full mt-1 mb-2"
        @change="model.hardcodedEntityId = ''"
      />

      <div class="flex items-center gap-2 mt-2">
        <RadioButton v-model="targetType" inputId="rt2" value="hardcoded" />
        <label for="rt2" class="text-sm cursor-pointer">{{ t('nodes.read.hardcoded_target') }}</label>
      </div>
      <Select 
        v-if="targetType === 'hardcoded'"
        v-model="model.hardcodedEntityId" 
        :options="groupedEntities" 
        optionLabel="friendly_name" 
        optionValue="entity_id" 
        optionGroupLabel="label" 
        optionGroupChildren="items"
        filter
        placeholder="Select HA Entity" 
        class="w-full mt-1"
        @change="model.targetVariableName = ''"
      />
    </div>

    <!-- ATTRIBUTE -->
    <div class="flex flex-col gap-1">
      <label class="text-xs font-bold text-slate-500 uppercase">{{ t('nodes.read.attribute') }}</label>
      <InputText v-model="model.attribute" placeholder="e.g., current_temperature" />
    </div>

    <Divider />

    <!-- TTS TEMPLATE -->
    <div class="flex flex-col gap-1">
      <label class="text-xs font-bold text-slate-500 uppercase">{{ t('nodes.read.tts_template') }}</label>
      <InputText v-model="model.ttsTemplate" />
    </div>

    <!-- NEXT NODE -->
    <div class="flex flex-col gap-1 mt-2">
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
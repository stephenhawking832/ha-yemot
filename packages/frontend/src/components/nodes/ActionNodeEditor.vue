<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useIvrStore } from '../../store/ivr';
import type { ActionNode } from '@ha-yemot/shared';

import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import RadioButton from 'primevue/radiobutton';
import Divider from 'primevue/divider';

const { t } = useI18n();
const ivrStore = useIvrStore();
const model = defineModel<ActionNode>({ required: true });

// --- SMART DROPDOWN POPULATORS ---
// Find all TargetNodes to get their variable names (for targetVariableName)
const targetVariables = computed(() => {
  if (!ivrStore.config) return [];
  const nodes = Object.values(ivrStore.config.nodes).filter(n => n.type === 'target');
  return nodes});

// Find all ServiceSelectNodes to get their variable names (for actionVariableName)
const actionVariables = computed(() => {
  if (!ivrStore.config) return [];
  const nodes = Object.values(ivrStore.config.nodes).filter(n => n.type === 'service_select');
    return nodes;
});

const availableNodes = computed(() => {
  if (!ivrStore.config) return [];
  const nodes = Object.values(ivrStore.config.nodes).filter(n => n.id !== model.value.id);
  // Add a fake "Hang up" option at the top
  return [{ id: '', name: '-- Hang Up Call --' }, ...nodes];
});

// Radio button state for Action Type (Dynamic vs Hardcoded)
const actionType = ref(model.value.actionVariableName ? 'dynamic' : 'hardcoded');

// Local state for the JSON Textarea (since model stores it as a JS object)
const jsonString = ref(model.value.dataPayloadTemplate ? JSON.stringify(model.value.dataPayloadTemplate, null, 2) : '{}');

const updateJson = (newString: string) => {
  try {
    model.value.dataPayloadTemplate = JSON.parse(newString);
  } catch (e) {
    // If they are mid-typing, don't crash. Just wait until it's valid JSON.
  }
};
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- TARGET SELECTION -->
    <div class="flex flex-col gap-1">
      <label class="text-xs font-bold text-slate-500 uppercase">{{ t('nodes.action.target_variable') }}</label>
      <Select 
        v-model="model.targetVariableName" 
        :options="targetVariables"
        optionLabel="name"
        optionValue="variableName"
        placeholder="Select or type variable name" 
        class="w-full"
      />
    </div>

    <Divider />

    <!-- ACTION SELECTION (Dynamic or Hardcoded) -->
    <div class="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded">
      <label class="text-xs font-bold text-slate-500 uppercase">{{ t('nodes.action.action_type') }}</label>
      
      <div class="flex items-center gap-2 mt-2">
        <RadioButton v-model="actionType" inputId="at1" value="dynamic" />
        <label for="at1" class="text-sm cursor-pointer">{{ t('nodes.action.dynamic_action') }}</label>
      </div>
      <Select 
        v-if="actionType === 'dynamic'"
        v-model="model.actionVariableName" 
        :options="actionVariables"
        optionLabel="name"
        optionValue="variableName"        
        placeholder="Select service variable name" 
        class="w-full mt-1 mb-2"
        @change="model.hardcodedAction = ''"
      />

      <div class="flex items-center gap-2 mt-2">
        <RadioButton v-model="actionType" inputId="at2" value="hardcoded" />
        <label for="at2" class="text-sm cursor-pointer">{{ t('nodes.action.hardcoded_action') }}</label>
      </div>
      <InputText 
        v-if="actionType === 'hardcoded'"
        v-model="model.hardcodedAction" 
        placeholder="e.g., climate.turn_on" 
        class="w-full mt-1"
        @input="model.actionVariableName = ''"
      />
    </div>

    <!-- JSON PAYLOAD TEMPLATE -->
    <div class="flex flex-col gap-1">
      <label class="text-xs font-bold text-slate-500 uppercase">{{ t('nodes.action.payload_template') }}</label>
      <Textarea 
        v-model="jsonString" 
        @update:modelValue="updateJson"
        rows="4" 
        class="font-mono text-sm" 
        placeholder='{ "temperature": "{{target_temp}}" }' 
      />
    </div>

    <Divider />

    <!-- TTS FEEDBACK -->
    <div class="flex flex-col gap-1">
      <label class="text-xs font-bold text-slate-500 uppercase">{{ t('nodes.action.success_tts') }}</label>
      <InputText v-model="model.successTts" />
    </div>
    <div class="flex flex-col gap-1">
      <label class="text-xs font-bold text-slate-500 uppercase">{{ t('nodes.action.fail_tts') }}</label>
      <InputText v-model="model.failTts" placeholder="Optional error message" />
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
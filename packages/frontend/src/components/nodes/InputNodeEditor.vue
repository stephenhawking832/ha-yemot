<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useIvrStore } from '../../store/ivr';
import type { InputNode } from '@ha-yemot/shared';

import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import Divider from 'primevue/divider';

const { t } = useI18n();
const ivrStore = useIvrStore();
const model = defineModel<InputNode>({ required: true });

const availableNodes = computed(() => {
  if (!ivrStore.config) return [];
  return Object.values(ivrStore.config.nodes).filter(n => n.id !== model.value.id);
});
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

    <!-- Digits Validation -->
    <div class="flex gap-4">
      <div class="flex flex-col gap-1 flex-1">
        <label class="text-xs font-bold text-slate-500 uppercase">{{ t('nodes.input.min_digits') }}</label>
        <InputNumber v-model="model.minDigits" :min="1" :max="50" class="w-full" />
      </div>
      <div class="flex flex-col gap-1 flex-1">
        <label class="text-xs font-bold text-slate-500 uppercase">{{ t('nodes.input.max_digits') }}</label>
        <InputNumber v-model="model.maxDigits" :min="1" :max="50" class="w-full" />
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
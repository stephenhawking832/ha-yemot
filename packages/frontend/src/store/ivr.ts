// packages/frontend/src/store/ivr.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiFetch } from '../api/client';
import type { IVRSystemConfig, RichEntity } from '@ha-yemot/shared';

export const useIvrStore = defineStore('ivr', () => {
  // The complete IVR Tree Configuration
  const config = ref<IVRSystemConfig | null>(null);
  
  // The cached list of HA entities for GUI dropdowns
  const entities = ref<RichEntity[]>([]);
  
  // Loading states for UI spinners
  const isLoading = ref(false);
  const isSaving = ref(false);

  /**
   * Fetches the current IVR configuration from the backend.
   */
  async function loadConfig() {
    isLoading.value = true;
    try {
      config.value = await apiFetch<IVRSystemConfig>('/api/config');
    } catch (error) {
      console.error('Failed to load config:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Saves the current IVR configuration back to the backend.
   */
  async function saveConfig() {
    if (!config.value) return;
    
    isSaving.value = true;
    try {
      await apiFetch('/api/config', {
        method: 'POST',
        body: JSON.stringify(config.value),
      });
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    } finally {
      isSaving.value = false;
    }
  }

  /**
   * Fetches the rich entity list from Home Assistant via the backend.
   */
  async function loadEntities() {
    try {
      entities.value = await apiFetch<RichEntity[]>('/api/ha/entities');
    } catch (error) {
      console.error('Failed to load HA entities:', error);
    }
  }

  return {
    config,
    entities,
    isLoading,
    isSaving,
    loadConfig,
    saveConfig,
    loadEntities
  };
});
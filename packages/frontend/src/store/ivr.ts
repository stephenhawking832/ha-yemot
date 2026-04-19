// packages/frontend/src/store/ivr.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiFetch } from '../api/client';
import type { IVRSystemConfig, RichEntity, SecuritySettings } from '@ha-yemot/shared';

// Define the response type for the API Key generation
export interface ApiKeyResponse {
  newApiKey: string;
  warning: string;
}

export const useIvrStore = defineStore('ivr', () => {
  // The complete IVR Tree Configuration
  const config = ref<IVRSystemConfig | null>(null);
  const security = ref<SecuritySettings | null>(null);
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

  /**
   * Generates a new Yemot API Key.
   */
  async function generateApiKey(): Promise<ApiKeyResponse> {
    try {
      return await apiFetch<ApiKeyResponse>('/api/auth/api-key', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to generate API Key:', error);
      throw error;
    }
  }

  /**
   * Updates the allowed phones whitelist.
   */
  async function updateAllowedPhones(phones: string[]): Promise<void> {
    try {
      await apiFetch('/api/auth/phones', {
        method: 'POST',
        body: JSON.stringify({ phones }),
      });
      
      // Update local state if successful
      if (security.value) {
        security.value.allowedPhones = phones;
      }
    } catch (error) {
      console.error('Failed to update phone whitelist:', error);
      throw error;
    }
  }

  return {
    config,
    entities,
    security,
    isLoading,
    isSaving,
    loadConfig,
    saveConfig,
    loadEntities,
    generateApiKey,
    updateAllowedPhones
  };
});
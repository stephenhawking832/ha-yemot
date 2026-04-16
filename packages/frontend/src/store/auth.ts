// packages/frontend/src/store/auth.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiFetch } from '../api/client';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('jwt_token'));

  const isAuthenticated = computed(() => token.value !== null);

  async function login(username: string, password: string) {
    try {
      const response = await apiFetch<{ token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      
      token.value = response.token;
      localStorage.setItem('jwt_token', response.token);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  function logout() {
    token.value = null;
    localStorage.removeItem('jwt_token');
  }

  return { token, isAuthenticated, login, logout };
});
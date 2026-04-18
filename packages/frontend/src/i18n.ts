import { createI18n } from 'vue-i18n';
import en from './locales/en.json';

// We explicitly set the type so TypeScript provides autocomplete for our translation keys!
export type MessageSchema = typeof en;

export const i18n = createI18n<[MessageSchema], 'en'>({
  legacy: false, // Must be false to use the modern Vue 3 Composition API
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en
  }
});
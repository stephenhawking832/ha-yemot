import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import he from './locales/he.json';


export type MessageSchema = typeof en;

export const i18n = createI18n<[MessageSchema], 'en' | 'he'>({
  legacy: false,
  locale: 'he',
  fallbackLocale: 'en',
  messages: {
    en,
    he
  }
});
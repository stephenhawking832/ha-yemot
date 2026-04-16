import { createApp } from 'vue';
import { createPinia } from 'pinia';

// PrimeVue v4 & Icons
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import 'primeicons/primeicons.css';

// Tailwind & Base Styles
import './style.css';

// Internal Modules
import { i18n } from './i18n';
import { router } from './router';
import App from './App.vue';

const app = createApp(App);

// 1. Initialize Pinia (State Management)
app.use(createPinia());

// 2. Initialize i18n (Translations)
app.use(i18n);
// 2.5 Initialize Router
app.use(router);

// 3. Initialize PrimeVue v4 with the Aura theme
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: 'system', // Automatically respects OS dark mode
      cssLayer: {
        name: 'primevue',
        order: 'tailwind-base, primevue, tailwind-utilities'
      }
    }
  }
});

// Mount the application
app.mount('#app');
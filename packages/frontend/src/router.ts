// packages/frontend/src/router.ts
import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from './store/auth';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('./views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('./views/DashboardLayout.vue'), // The App Shell
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'TreeEditor',
        component: () => import('./views/TreeEditorView.vue')
      }
    ]
  }
];

export const router = createRouter({
  // Hash history is safer for standalone Docker containers without complex Nginx rewrite rules
  history: createWebHashHistory(), 
  routes
});

// Global Navigation Guard
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // If route requires auth and user is NOT logged in -> redirect to login
    next({ name: 'Login' });
  } else if (to.name === 'Login' && authStore.isAuthenticated) {
    // If user goes to login page but is ALREADY logged in -> redirect to dashboard
    next({ name: 'Dashboard' });
  } else {
    // Otherwise, proceed normally
    next();
  }
});
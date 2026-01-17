import { createRouter, createWebHistory } from 'vue-router';
import Auth from '../views/Auth.vue';
import Game from '../views/Game.vue';
import Admin from '../views/Admin.vue';
import { useAuthStore } from '../store/auth.store';

const routes = [
  { path: '/', redirect: '/auth' },
  { path: '/auth', component: Auth },
  { path: '/game', component: Game },
  { path: '/admin', component: Admin, meta: { requiresAdmin: true } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const auth = useAuthStore();

  if (to.meta.requiresAdmin) {
    if (!auth.user || !auth.isAdmin) {
      return next('/auth');
    }
  }

  next();
});

export default router;

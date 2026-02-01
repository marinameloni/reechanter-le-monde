import { createRouter, createWebHistory } from 'vue-router';
import Auth from '../views/Auth.vue';
import CreateRobot from '../views/CreateRobot.vue';
import Index from '../views/Index.vue';
import Game from '../views/Game.vue';
import Admin from '../views/Admin.vue';
import Features from '../views/Features.vue';
import Help from '../views/Help.vue';
import { useAuthStore } from '../store/auth.store';

const routes = [
  { path: '/', component: Index },
  { path: '/auth', component: Auth },
  { path: '/create', component: CreateRobot },
  { path: '/features', component: Features },
  { path: '/help', component: Help },
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

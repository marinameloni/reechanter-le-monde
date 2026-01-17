import { createRouter, createWebHistory } from 'vue-router';
import Auth from '../views/Auth.vue';
import Game from '../views/Game.vue';
import Admin from '../views/Admin.vue';

const routes = [
  { path: '/', redirect: '/auth' },
  { path: '/auth', component: Auth },
  { path: '/game', component: Game },
  { path: '/admin', component: Admin }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;

import { defineStore } from 'pinia';
import api from '../services/api';

function isTokenExpired(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return true;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64);
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return now >= payload.exp;
  } catch (e) {
    return true;
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,      // { id, username, role, color, ... }
    token: null,     // JWT renvoyé par le backend
    isAdmin: false,  // dérivé de user.role === 'admin'
    error: null,     // dernier message d'erreur login/signup
    loading: false,  // état de chargement
  }),
  actions: {
    init() {
      // Hydrate depuis le stockage si présent et valide
      try {
        const rawUser = localStorage.getItem('auth_user');
        const token = localStorage.getItem('auth_token');
        if (!token || !rawUser) {
          return;
        }

        const isExpired = isTokenExpired(token);
        if (isExpired) {
          this.logout();
          return;
        }

        const payloadUser = JSON.parse(rawUser);
        this.user = payloadUser;
        this.token = token;
        this.isAdmin = !!(payloadUser && payloadUser.role === 'admin');
      } catch (e) {
        // en cas d'erreur, on remet à zéro
        this.logout();
      }
    },

    async login(credentials) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.post('/api/auth/login', credentials);

        // Compat avec la forme actuelle { success, token, player }
        const payloadUser = res.data.user || res.data.player;

        this.user = payloadUser;
        this.token = res.data.token || null;
        this.isAdmin = !!(payloadUser && payloadUser.role === 'admin');

        // persiste en local pour rester connecté
        if (this.token && this.user) {
          localStorage.setItem('auth_token', this.token);
          localStorage.setItem('auth_user', JSON.stringify(this.user));
        }
      } catch (err) {
        this.error = err.response?.data?.message || 'Login failed';
        console.error('Login failed', err);
      } finally {
        this.loading = false;
      }
    },

    async signup(payload) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.post('/api/auth/signup', payload);

        const payloadUser = res.data.user || res.data.player;

        this.user = payloadUser;
        this.token = res.data.token || null;
        this.isAdmin = !!(payloadUser && payloadUser.role === 'admin');

        // persiste en local
        if (this.token && this.user) {
          localStorage.setItem('auth_token', this.token);
          localStorage.setItem('auth_user', JSON.stringify(this.user));
        }
      } catch (err) {
        this.error = err.response?.data?.message || 'Signup failed';
        console.error('Signup failed', err);
      } finally {
        this.loading = false;
      }
    },

    logout() {
      this.user = null;
      this.token = null;
      this.isAdmin = false;
      this.error = null;

      try {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      } catch (_) {
        // ignore storage errors
      }
    },

  },
});


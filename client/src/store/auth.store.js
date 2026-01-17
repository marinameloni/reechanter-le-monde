import { defineStore } from 'pinia';
import api from '../services/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,      // { id, username, role, character_gender, hair_color, tshirt_color, ... }
    token: null,     // JWT renvoyé par le backend
    isAdmin: false,  // dérivé de user.role === 'admin'
    error: null,     // dernier message d'erreur login/signup
    loading: false,  // état de chargement
  }),
  actions: {
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
    },
  },
});


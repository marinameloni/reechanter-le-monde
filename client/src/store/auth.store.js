import { defineStore } from 'pinia';
import axios from 'axios';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    player: null,
    token: null,
  }),
  actions: {
    async login(username, password) {
      try {
        const res = await axios.post('http://localhost:4000/api/auth/login', { username, password });
        this.token = res.data.token;
        this.player = res.data.player;
        return true;
      } catch (err) {
        console.error('Login failed', err);
        return false;
      }
    },
    async signup(playerData) {
      try {
        const res = await axios.post('http://localhost:4000/api/auth/signup', playerData);
        this.token = res.data.token;
        this.player = res.data.player;
        return true;
      } catch (err) {
        console.error('Signup failed', err);
        return false;
      }
    },
    logout() {
      this.player = null;
      this.token = null;
    },
  },
});

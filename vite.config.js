// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue'; // ou react, selon ton projet

export default defineConfig({
  plugins: [vue()], // ou react()
  
  server: {
    // si tu veux dev avec localhost ou IP
    host: true,
  },

  preview: {
    // autorise ton domaine pour la preview ou build prod
    allowedHosts: ['repairloop.paasul.fr', 'localhost', '127.0.0.1'],
  },
});

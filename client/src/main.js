import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import { useAuthStore } from './store/auth.store';

const app = createApp(App);

app.use(router);
const pinia = createPinia();
app.use(pinia);

// Hydrate auth state from localStorage before mount
const auth = useAuthStore();
auth.init();

app.mount('#app');

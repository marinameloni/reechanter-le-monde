import axios from 'axios';

// Instance Axios centralisée pour tous les appels au backend
// Backend Express tourne sur l'URL définie dans VITE_API_URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Injecte automatiquement le token (si présent) depuis localStorage
api.interceptors.request.use((config) => {
	try {
		const token = localStorage.getItem('auth_token');
		if (token) {
			config.headers = config.headers || {};
			config.headers.Authorization = `Bearer ${token}`;
		}
	} catch (_) {
		// ignore storage errors
	}
	return config;
});

export default api;

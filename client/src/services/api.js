import axios from 'axios';

// Instance Axios centralisée pour tous les appels au backend
// Backend Express tourne sur http://localhost:4000
const api = axios.create({
	baseURL: 'http://localhost:4000',
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

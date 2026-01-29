import axios from 'axios';

// Instance Axios centralisée pour tous les appels au backend
// Priorité à VITE_API_URL; sinon fallback intelligent selon l'environnement
function resolveApiBaseURL() {
	const envUrl = (import.meta.env && import.meta.env.VITE_API_URL) || '';
	if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
		const v = envUrl.trim();
		// If user supplied a relative '/api' as build arg, avoid duplicating '/api' in requests
		if (v === '/api') return '';
		// strip trailing slash for consistency
		return v.endsWith('/') ? v.replace(/\/$/, '') : v;
	}

	// Fallback: si on sert le front sur :3000 (dev/prod sans proxy), cible :3001/api
	// Sinon, même origine avec préfixe /api (utile derrière Nginx)
	try {
		const { protocol, hostname, port } = window.location;
		if (port === '3000') return `${protocol}//${hostname}:3001/api`;
		// ports 80/443 ou autre: suppose un reverse proxy qui sert /api
		return `${protocol}//${hostname}/api`;
	} catch {
		// Dernier recours
		return '/api';
	}
}

const api = axios.create({
	baseURL: resolveApiBaseURL(),
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

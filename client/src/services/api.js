import axios from 'axios';

// Instance Axios centralisée pour tous les appels au backend
// Backend Express tourne sur http://localhost:4000
const api = axios.create({
	baseURL: 'http://localhost:4000',
});

export default api;

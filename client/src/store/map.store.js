import { defineStore } from 'pinia';
import api from '../services/api';

export const useMapStore = defineStore('map', {
	state: () => ({
		maps: [],          // [{ id_map, name, width, height, is_final }]
		currentMapId: null,
		houses: [],        // maisons de la map courante
		loading: false,
		error: null,
	}),
	actions: {
		async loadMaps() {
			this.loading = true;
			this.error = null;
			try {
				const res = await api.get('/api/map');
				this.maps = res.data.maps || [];
			} catch (err) {
				this.error = err.response?.data?.message || 'Failed to load maps';
				console.error('Failed to load maps', err);
			} finally {
				this.loading = false;
			}
		},

		async loadHouses(mapId) {
			this.loading = true;
			this.error = null;
			try {
				const res = await api.get(`/api/map/${mapId}/houses`);
				this.houses = res.data.houses || [];
				this.currentMapId = mapId;
			} catch (err) {
				this.error = err.response?.data?.message || 'Failed to load houses';
				console.error('Failed to load houses', err);
			} finally {
				this.loading = false;
			}
		},
	},
});

<template>
	<section class="game-view">
		<Header />

		<main>
			<p v-if="game.error" class="error">{{ game.error }}</p>
			<p v-else-if="!game.connected">Connexion au serveur de jeu en cours <span class="loader" aria-hidden="true"></span></p>
			<p v-else>Connecté au serveur temps réel (Colyseus).</p>


			<section class="players" v-if="game.clients.length">
				<h2>Joueurs connectés</h2>
				<ul class="player-list">
					<li v-for="p in game.clients" :key="p.sessionId" class="userlist">
						<div class="player-list-sprite" v-html="getPlayerSprite(p)"></div>
						<span class="player-list-name">{{ p.username }}</span>
					</li>
				</ul>
			</section>

			<!-- Placeholder pour la future carte 2D -->
			<section class="map-section">
				<GameMap v-if="isReady && startMapId != null" :initialMapId="startMapId" />
			</section>
		</main>
	</section>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import Header from '../components/ui/Header.vue';
import { useAuthStore } from '../store/auth.store';
import { useGameStore } from '../store/game.store';
import GameMap from '../components/game/GameMap.vue';
import api from '../services/api';
// load raw SVG sprites so we can inline a small icon in the player list
const sprites = import.meta.glob('/src/assets/sprites/**/*.svg', { query: '?raw', import: 'default', eager: true });

function getPlayerSprite(p) {
	const color = (p && p.color) ? p.color : 'default';
	const path = `/src/assets/sprites/${color}/front.svg`;
	if (sprites[path]) return sprites[path];
	const fallback = `/src/assets/sprites/default/front.svg`;
	return sprites[fallback] || '';
}

const auth = useAuthStore();
const game = useGameStore();

const localColor = ref('#ccc');
const availableColors = ['blue', 'green', 'orange', 'pink', 'purple', 'red', 'turquoise', 'yellow'];
// default to `true` to ensure the map renders immediately when no saved map is present
const startMapId = ref(auth.user?.id_map ?? true);
const isReady = ref(false);

watch(
	() => auth.user?.color,
	(newColor) => {
		if (newColor) {
			localColor.value = newColor;
		}
	},
	{ immediate: true }
);

const handleColorChange = async (newColor) => {
	if (!auth.user) return;
  localColor.value = newColor;

	// mets à jour immédiatement le user local
	auth.user = {
		...auth.user,
		color: newColor,
	};

	// persistance + temps réel via le store de jeu
	await game.updatePlayerColor(auth.user.id, newColor);
};

onMounted(async () => {
	// Determine player's saved map or highest unlocked; don't render until computed
	if (startMapId.value == null) {
		try {
			const id = auth.user?.id;
			if (id) {
				const res = await api.get(`/api/player/${id}`);
				const m = res.data?.player?.id_map;
				if (typeof m === 'number' && m >= 1 && m <= 5) {
					startMapId.value = m;
				} else {
					// No saved map; fall back to highest unlocked
					try {
						const h = await api.get('/api/game/highest-unlocked');
						const hm = h.data?.highestUnlockedMapId;
						if (typeof hm === 'number' && hm >= 1 && hm <= 5) {
							startMapId.value = hm;
						}
					} catch {}
				}
			}
		} catch {}
	}
	// Connect to the correct room based on computed map
	// coerce boolean `true` to map 1 (Number(true) === 1)
	const mapToJoin = Number(startMapId.value) || 1;
	await game.connectToRoom(auth.user?.username, mapToJoin);
	isReady.value = true;
});
</script>

<style scoped>
@import '../styles/game.css';

/* Earthy page background */
.game-view {
	min-height: 100vh;
	background-color: #1B7FA3;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 24px;
}

/* Header bar styled like other pages */
.game-header {
	width: 1030px;
	max-width: 94%;
	background: #082F45;
	border: 6px solid #5b4a33;
	border-radius: 16px;
	color: white;
	padding: 12px 20px;
	display: flex;
	justify-content: space-between;
	align-items: center;
	box-shadow: 0 12px 24px rgba(0,0,0,0.22);
	margin-bottom: 16px;
}

main {
	min-width: 1030px;
	width: 100%;
	max-width: 1050px;
	background: #082F45;
	border: 6px solid #FFCF4D;
	border-radius: 16px;
	padding: 20px;
	color: white;
	box-shadow: 0 12px 24px rgba(0,0,0,0.22);
}

.map-section {
	margin-top: 12px;
	background: #082F45;
	border: 2px solid #FFCF4D;
	border-radius: 12px;
	padding: 12px;
}

.player-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.userlist { display:flex; align-items:center; gap:12px; padding:6px 8px; background: rgba(0,0,0,0.06); border-radius:8px; }
.player-list-sprite svg { width: 36px; height: 36px; display: block; }
.player-list-name { color: #fff; }

.robot-preview { width: 20px; height: 20px; border-radius: 4px; border: 2px solid #3e4a3e; }

</style>

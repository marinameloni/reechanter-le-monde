<template>
	<section class="game-view">
		<header class="game-header">
			<h1>Reenchanter le Monde</h1>
			<div v-if="auth.user" class="player-info">
				<span class="username">{{ auth.user.username }}</span>
				<span class="role" v-if="auth.isAdmin">(admin)</span>
				<div class="robot-preview" :style="{ backgroundColor: localColor }"></div>
				<router-link v-if="auth.isAdmin" to="/admin" class="admin-link">Admin</router-link>
			</div>
		</header>

		<main>
			<p v-if="game.error" class="error">{{ game.error }}</p>
			<p v-else-if="!game.connected">Connexion au serveur de jeu en cours...</p>
			<p v-else>Connecté au serveur temps réel (Colyseus).</p>

      <section v-if="auth.user" class="color-customization">
        <label>
          Couleur du robot :
          <div class="color-selector">
            <div
              v-for="c in availableColors"
              :key="c"
              class="color-option"
              :class="{ selected: localColor === c }"
              :style="{ backgroundColor: c }"
              @click="handleColorChange(c)"
            ></div>
          </div>
        </label>
      </section>

			<section class="players" v-if="game.clients.length">
				<h2>Joueurs connectés</h2>
				<ul>
					<li v-for="p in game.clients" :key="p.sessionId">
						{{ p.username }}
					</li>
				</ul>
			</section>

			<!-- Placeholder pour la future carte 2D -->
			<section class="map-section">
				<GameMap v-if="isReady && startMapId != null" :initialMapId="startMapId" />
				<pre class="debug-state">
Tiles: {{ game.tiles.length }} | Ruins: {{ game.ruins.length }} | Buildings: {{ game.buildings.length }}
				</pre>
			</section>
		</main>
	</section>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { useAuthStore } from '../store/auth.store';
import { useGameStore } from '../store/game.store';
import GameMap from '../components/game/GameMap.vue';
import api from '../services/api';

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
.game-view {
	padding: 20px;
}

.game-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}

.player-info {
	display: flex;
	align-items: center;
	gap: 10px;
}

.robot-preview {
	width: 24px;
	height: 24px;
	border: 1px solid #000;
}

.admin-link {
	margin-left: 10px;
	padding: 4px 8px;
	border-radius: 6px;
	background: #333;
	color: #fff;
	text-decoration: none;
}

.color-customization {
  margin: 10px 0;
}

.color-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 5px;
}

.color-option {
  width: 30px;
  height: 30px;
  border: 2px solid transparent;
  cursor: pointer;
}

.color-option.selected {
  border-color: #000;
}


.color-customization {
	margin: 10px 0 0;
	font-size: 0.9rem;
}

.color-customization input[type='color'] {
	margin-left: 8px;
	vertical-align: middle;
}
</style>
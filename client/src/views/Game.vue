<template>
	<section class="game-view">
		<header class="game-header">
			<h1>Reenchanter le Monde</h1>
			<div v-if="auth.user" class="player-info">
				<span class="username">{{ auth.user.username }}</span>
				<span class="role" v-if="auth.isAdmin">(admin)</span>
				<div class="robot-preview" :style="{ backgroundColor: localColor }"></div>
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
				<GameMap />
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

const auth = useAuthStore();
const game = useGameStore();

const localColor = ref('#ccc');
const availableColors = ['blue', 'green', 'orange', 'pink', 'purple', 'red', 'turquoise', 'yellow'];

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
	await game.connectToRoom(auth.user?.username);
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
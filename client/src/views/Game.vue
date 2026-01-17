<template>
	<section class="game-view">
		<header class="game-header">
			<h1>Reenchanter le Monde</h1>
			<div v-if="auth.user" class="player-info">
				<span class="username">{{ auth.user.username }}</span>
				<span class="role" v-if="auth.isAdmin">(admin)</span>
				<div class="avatar-preview">
					<div
						class="hair"
						:style="{ backgroundColor: auth.user.hair_color || '#000' }"
					></div>
					<div
						class="tshirt"
						:style="{ backgroundColor: auth.user.tshirt_color || '#fff' }"
					></div>
				</div>
			</div>
		</header>

		<main>
			<p v-if="game.error" class="error">{{ game.error }}</p>
			<p v-else-if="!game.connected">Connexion au serveur de jeu en cours...</p>
			<p v-else>Connecté au serveur temps réel (Colyseus).</p>

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
import { onMounted } from 'vue';
import { useAuthStore } from '../store/auth.store';
import { useGameStore } from '../store/game.store';
import GameMap from '../components/game/GameMap.vue';

const auth = useAuthStore();
const game = useGameStore();

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

.avatar-preview {
	display: flex;
	flex-direction: column;
	width: 24px;
}

.hair {
	width: 24px;
	height: 8px;
	border-radius: 4px 4px 0 0;
}

.tshirt {
	width: 24px;
	height: 16px;
	border-radius: 0 0 4px 4px;
}

.debug-state {
	margin-top: 20px;
	background: #f4f4f4;
	padding: 10px;
	border-radius: 4px;
}

.error {
	color: #b3261e;
	margin-bottom: 10px;
}

.map-section {
	display: flex;
	gap: 20px;
	align-items: flex-start;
	margin-top: 20px;
}
</style>
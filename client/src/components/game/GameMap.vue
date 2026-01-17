<template>
	<div class="game-map">
		<div class="map-wrapper" :style="wrapperStyle">
			<img :src="mapImage" :alt="map.name" class="map-image" />
			<div class="tiles-overlay" :style="gridStyle">
				<Tile
					v-for="tile in gridTiles"
					:key="tile.id"
					:size="map.tileSize"
					:blocked="isBlocked(tile.x, tile.y)"
				/>
			</div>
			<PlayerSprite
				:tile-size="map.tileSize"
				:x="playerX"
				:y="playerY"
			/>
		</div>
		<div class="hud">
			<p>Position: ({{ playerX }}, {{ playerY }})</p>
			<p>Bricks: {{ bricks }} | Rocks: {{ rocks }}</p>
			<p class="controls">
				Use arrow keys or WASD to move.
				Press Space or E to interact with factories/ruins.
			</p>
		</div>
	</div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import map from '../../assets/maps/map1.json';
import mapImage from '../../assets/maps/maplevel1.png';
import Tile from './Tile.vue';
import PlayerSprite from './PlayerSprite.vue';

const wrapperStyle = {
	width: map.width * map.tileSize + 'px',
	height: map.height * map.tileSize + 'px',
};

const gridStyle = {
	display: 'grid',
	gridTemplateColumns: `repeat(${map.width}, ${map.tileSize}px)`,
	gridTemplateRows: `repeat(${map.height}, ${map.tileSize}px)`,
	width: '100%',
	height: '100%',
};

const gridTiles = Array.from({ length: map.width * map.height }, (_, index) => ({
	id: index,
	x: index % map.width,
	y: Math.floor(index / map.width),
}));

const unwalkableCoords = [
	[8, 0],
	[9, 0],
	[10, 0],
	[23, 0],
	[24, 0],
	[25, 0],
	[5, 1],
	[9, 1],
	[10, 1],
	[18, 1],
	[20, 1],
	[21, 1],
	[22, 1],
	[23, 1],
	[24, 1],
	[25, 1],
	[26, 1],
	[27, 1],
	[28, 1],
	[29, 1],
	[30, 1],
	[2, 2],
	[18, 2],
	[19, 2],
	[20, 2],
	[21, 2],
	[22, 2],
	[23, 2],
	[24, 2],
	[25, 2],
	[26, 2],
	[27, 2],
	[28, 2],
	[29, 2],
	[30, 2],
	[0, 3],
	[5, 3],
	[18, 3],
	[20, 3],
	[21, 3],
	[22, 3],
	[23, 3],
	[24, 3],
	[25, 3],
	[26, 3],
	[27, 3],
	[28, 3],
	[29, 3],
	[30, 3],
	[5, 4],
	[6, 4],
	[19, 4],
	[20, 4],
	[21, 4],
	[22, 4],
	[23, 4],
	[24, 4],
	[25, 4],
	[26, 4],
	[27, 4],
	[29, 4],
	[30, 4],
	[5, 5],
	[7, 5],
	[8, 5],
	[20, 5],
	[21, 5],
	[22, 5],
	[23, 5],
	[24, 5],
	[25, 5],
	[26, 5],
	[27, 5],
	[29, 5],
	[30, 5],
	[5, 6],
	[8, 6],
	[15, 6],
	[15, 7],
	[30, 7],
	[17, 8],
	[9, 10],
	[17, 10],
	[30, 10],
	[31, 10],
	[9, 11],
	[10, 11],
	[17, 11],
	[30, 11],
	[31, 11],
	[4, 12],
	[5, 12],
	[9, 12],
	[10, 12],
	[11, 12],
	[13, 12],
	[17, 12],
	[30, 12],
	[1, 13],
	[2, 13],
	[4, 13],
	[5, 13],
	[9, 13],
	[10, 13],
	[11, 13],
	[12, 13],
	[13, 13],
	[16, 13],
	[17, 13],
	[30, 13],
	[0, 14],
	[1, 14],
	[3, 15],
	[5, 16],
	[16, 16],
	[17, 16],
	[18, 16],
	[19, 16],
	[20, 16],
	[1, 17],
	[5, 17],
];

const factoryCoords = [
	[20, 4],
	[20, 5],
	[21, 5],
	[22, 5],
	[23, 5],
	[24, 5],
	[25, 5],
	[26, 5],
	[27, 5],
	[29, 5],
	[30, 5],
];

const debrisCoords = [
	[5, 3],
	[5, 4],
	[6, 4],
	[5, 5],
	[7, 5],
	[8, 5],
	[5, 6],
	[8, 6],
	[9, 10],
	[30, 10],
	[31, 10],
	[9, 11],
	[10, 11],
	[30, 11],
	[9, 12],
	[10, 12],
	[11, 12],
	[30, 12],
	[9, 13],
	[10, 13],
	[11, 13],
	[12, 13],
	[13, 13],
	[16, 13],
	[17, 13],
	[30, 13],
];

const unwalkableSet = new Set(unwalkableCoords.map(([x, y]) => `${x},${y}`));
const factorySet = new Set(factoryCoords.map(([x, y]) => `${x},${y}`));
const debrisSet = new Set(debrisCoords.map(([x, y]) => `${x},${y}`));

const playerX = ref(1);
const playerY = ref(1);
const bricks = ref(0);
const rocks = ref(0);
const destroyedTiles = ref([]);

function isDestroyed(x, y) {
	return destroyedTiles.value.some((t) => t.x === x && t.y === y);
}

function isBlocked(x, y) {
	const key = `${x},${y}`;
	return unwalkableSet.has(key) && !isDestroyed(x, y);
}

function movePlayer(deltaX, deltaY) {
	const targetX = playerX.value + deltaX;
	const targetY = playerY.value + deltaY;
	if (
		targetX < 0 ||
		targetY < 0 ||
		targetX >= map.width ||
		targetY >= map.height
	) {
		return;
	}
	if (isBlocked(targetX, targetY)) {
		return;
	}
	playerX.value = targetX;
	playerY.value = targetY;
}

function interact() {
	const key = `${playerX.value},${playerY.value}`;
	if (factorySet.has(key) && !isDestroyed(playerX.value, playerY.value)) {
		destroyedTiles.value.push({ x: playerX.value, y: playerY.value });
		bricks.value += 1;
		return;
	}
	if (debrisSet.has(key) && !isDestroyed(playerX.value, playerY.value)) {
		destroyedTiles.value.push({ x: playerX.value, y: playerY.value });
		rocks.value += 1;
	}
}

function handleKeyDown(event) {
	if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
		movePlayer(0, -1);
	} else if (
		event.key === 'ArrowDown' ||
		event.key === 's' ||
		event.key === 'S'
	) {
		movePlayer(0, 1);
	} else if (
		event.key === 'ArrowLeft' ||
		event.key === 'a' ||
		event.key === 'A'
	) {
		movePlayer(-1, 0);
	} else if (
		event.key === 'ArrowRight' ||
		event.key === 'd' ||
		event.key === 'D'
	) {
		movePlayer(1, 0);
	} else if (
		event.key === ' ' ||
		event.key === 'e' ||
		event.key === 'E'
	) {
		interact();
	}
}

onMounted(() => {
	window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
	window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.game-map {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
}

.map-wrapper {
	position: relative;
	overflow: hidden;
	border: 2px solid #333;
	border-radius: 8px;
}

.map-image {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.tiles-overlay {
	position: absolute;
	top: 0;
	left: 0;
	pointer-events: none;
}

.hud {
	margin-top: 8px;
	font-size: 0.9rem;
	color: #555;
}

.controls {
	font-size: 0.8rem;
	color: #777;
}
</style>

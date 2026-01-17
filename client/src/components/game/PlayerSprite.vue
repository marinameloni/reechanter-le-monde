<template>
	<div
		class="player-sprite"
		:style="{
			width: tileSize + 'px',
			height: tileSize * 1.5 + 'px',
			transform: `translate(${x * tileSize}px, ${y * tileSize - tileSize * 0.5}px)`,
		}"
	>
		<div v-if="name" class="player-name">{{ name }}</div>
		<img :src="girlSprite" alt="Player" class="player-image" />
	</div>
</template>

<script setup>
import girlSprite from '../../assets/sprites/girl.png';

defineProps({
	tileSize: { type: Number, required: true },
	x: { type: Number, required: true },
	y: { type: Number, required: true },
	name: { type: String, default: '' },
});
</script>

<style scoped>
.player-sprite {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 10;
	display: flex;
	align-items: flex-end;
	justify-content: center;
	pointer-events: none;
}

.player-name {
	position: absolute;
	bottom: 100%;
	left: 50%;
	transform: translateX(-50%) translateY(-2px);
	padding: 0 4px;
	font-size: 10px;
	line-height: 1.2;
	color: #fff;
	background: rgba(0, 0, 0, 0.7);
	border-radius: 4px;
	white-space: nowrap;
}

.player-image {
	width: 100%;
	height: 100%;
	object-fit: contain;
	image-rendering: pixelated;
	filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.7));
}
</style>

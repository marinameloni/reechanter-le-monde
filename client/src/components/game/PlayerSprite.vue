<template>
	<div
		class="player-sprite"
		:style="{
			width: tileSize + 'px',
			height: tileSize + 'px',
			transform: `translate(${x * tileSize}px, ${y * tileSize}px)`
		}"
	>
		<div v-if="name" class="player-name">{{ name }}</div>
		<div ref="svgContainer" class="player-svg" v-html="spriteSvg"></div>
	</div>
</template>

<script setup>
import { onMounted, watch, ref, nextTick } from 'vue';
import frontSvg from '../../assets/sprites/front.svg?raw';
import backSvg from '../../assets/sprites/back.svg?raw';
import sideLeftSvg from '../../assets/sprites/sideleft.svg?raw';
import sideRightSvg from '../../assets/sprites/sideright.svg?raw';
import walkFront1Svg from '../../assets/sprites/walkfront1.svg?raw';
import walkFront2Svg from '../../assets/sprites/walkfront2.svg?raw';
import walkLeft1Svg from '../../assets/sprites/walkleft1.svg?raw';
import walkLeft2Svg from '../../assets/sprites/walkleft2.svg?raw';
import walkRight1Svg from '../../assets/sprites/walkright1.svg?raw';
import walkRight2Svg from '../../assets/sprites/walkright2.svg?raw';

const props = defineProps({
	tileSize: { type: Number, required: true },
	x: { type: Number, required: true },
	y: { type: Number, required: true },
	name: { type: String, default: '' },
	// couleur principale appliquée sur un sous-ensemble d'IDs du robot
	colorPrimary: { type: String, default: '#D674CB' },
	direction: { type: String, default: 'down' }, // 'down' | 'up' | 'left' | 'right'
	isWalking: { type: Boolean, default: false },
});

const svgContainer = ref(null);
// Helper to pick the right SVG string based on direction and walk
function getSpriteSvg(direction, isWalking) {
	if (direction === 'up') return backSvg.replace('<svg ', '<svg viewBox="0 0 523 597" preserveAspectRatio="xMidYMax meet" width="45" height="45" ');
	if (direction === 'left') {
		if (isWalking) return walkLeft1Svg.replace('<svg ', '<svg viewBox="0 0 523 597" preserveAspectRatio="xMidYMax meet" width="45" height="45" ');
		return sideLeftSvg.replace('<svg ', '<svg viewBox="0 0 523 597" preserveAspectRatio="xMidYMax meet" width="45" height="45" ');
	}
	if (direction === 'right') {
		if (isWalking) return walkRight1Svg.replace('<svg ', '<svg viewBox="0 0 523 597" preserveAspectRatio="xMidYMax meet" width="45" height="45" ');
		return sideRightSvg.replace('<svg ', '<svg viewBox="0 0 523 597" preserveAspectRatio="xMidYMax meet" width="45" height="45" ');
	}
	if (direction === 'down') {
		if (isWalking) return walkFront1Svg.replace('<svg ', '<svg viewBox="0 0 523 597" preserveAspectRatio="xMidYMax meet" width="45" height="45" ');
		return frontSvg.replace('<svg ', '<svg viewBox="0 0 523 597" preserveAspectRatio="xMidYMax meet" width="45" height="45" ');
	}
	return frontSvg.replace('<svg ', '<svg viewBox="0 0 523 597" preserveAspectRatio="xMidYMax meet" width="45" height="45" ');
}

import { computed } from 'vue';
const spriteSvg = computed(() => getSpriteSvg(props.direction, props.isWalking));

const PRIMARY_IDS = ['id2', 'id3'];

function applyColors() {
	const root = svgContainer.value;
	if (!root) return;

	// recherche les éléments à recolorer uniquement dans ce sprite
	PRIMARY_IDS.forEach((id) => {
		const el = root.querySelector(`#${id}`);
		if (el) {
			el.style.fill = props.colorPrimary;
		}
	});
}

onMounted(async () => {
	// s'assure que le SVG est dans le DOM avant d'appliquer les couleurs
	await nextTick();
	applyColors();
});

watch(
	() => props.colorPrimary,
	() => {
		applyColors();
	}
);
watch(
	() => [props.colorPrimary, spriteSvg.value],
	() => {
		applyColors();
	}
);
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

.player-svg {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: flex-end;
	justify-content: center;
}

.player-svg svg {
	width: 45px;
	height: 45px;
	max-width: 100%;
	max-height: 100%;
	display: block;
	filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.7));
}
</style>

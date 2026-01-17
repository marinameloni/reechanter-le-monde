<template>
	<div
		class="tile"
		:class="{ blocked }"
		:style="{
			width: size + 'px',
			height: size + 'px',
		}"
		@click="$emit('toggle')"
	></div>
</template>

<script setup>
defineProps({
	blocked: { type: Boolean, default: false },
	size: { type: Number, required: true },
});

defineEmits(['toggle']);
</script>

<style scoped>
.tile {
	box-sizing: border-box;
	border: 1px solid rgba(255, 255, 255, 0.1);
	cursor: pointer;
	background-color: rgba(0, 0, 0, 0); /* transparent by défaut */
}

.tile.blocked {
	background-color: rgba(200, 40, 40, 0.45); /* rouge translucide pour non-walkable */
}
</style>

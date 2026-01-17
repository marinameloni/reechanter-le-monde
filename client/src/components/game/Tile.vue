<template>
	<div
		class="tile"
		:class="{ blocked }"
		:style="{
			width: size + 'px',
			height: size + 'px',
		}"
	></div>
</template>

<script setup>
defineProps({
	blocked: { type: Boolean, default: false },
	size: { type: Number, required: true },
});

// No custom emits: click is handled on the component instance from parent.
</script>

<style scoped>
.tile {
	box-sizing: border-box;
	border: 1px solid transparent;
	cursor: pointer;
	background-color: rgba(0, 0, 0, 0); /* transparent by défaut */
}

.tile.blocked {
	background-color: transparent;
}
</style>

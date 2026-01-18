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
import { ref, computed, onMounted, watch } from 'vue';

const props = defineProps({
  tileSize: { type: Number, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  name: { type: String, default: '' },
  color: { type: String, default: null }, // ex: "blue", "red", null
  direction: { type: String, default: 'down' },
  isWalking: { type: Boolean, default: false },
});

// ref pour le SVG
const spriteSvg = ref('');

// glob Vite pour charger tous les SVG en raw string
const sprites = import.meta.glob(
  '/src/assets/sprites/**/*.svg',
  { as: 'raw', eager: true }
);

// quelle frame afficher selon la direction et si le joueur marche
const spriteName = computed(() => {
  switch (props.direction) {
    case 'up':
      return 'back';
    case 'left':
      return props.isWalking ? 'walkleft1' : 'sideleft';
    case 'right':
      return props.isWalking ? 'walkright1' : 'sideright';
    case 'down':
    default:
      return props.isWalking ? 'walkfront1' : 'front';
  }
});

// chemin complet du sprite
const spritePath = computed(() => {
  const folder = props.color || 'default';
  return `/src/assets/sprites/${folder}/${spriteName.value}.svg`;
});

// charge le SVG, avec fallback si couleur manquante
function loadSprite() {
  const path = spritePath.value;
  const fallbackPath = `/src/assets/sprites/default/${spriteName.value}.svg`;
  const ultimateFallback = `/src/assets/sprites/default/front.svg`;

  if (sprites[path]) {
    spriteSvg.value = sprites[path];
  } else if (sprites[fallbackPath]) {
    spriteSvg.value = sprites[fallbackPath];
  } else {
    spriteSvg.value = sprites[ultimateFallback] || '';
  }
}

// lance au montage et à chaque changement de props
onMounted(loadSprite);
watch(() => [props.color, props.direction, props.isWalking], loadSprite);
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

/* important : :deep pour scoped CSS afin d'atteindre le SVG injecté via v-html */
.player-svg :deep(svg) {
  width: 45px;
  height: 45px;
  max-width: 100%;
  max-height: 100%;
  display: block;
  filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.7));
}
</style>

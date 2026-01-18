<template>
  <div class="svg-preview" v-html="spriteSvg"></div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const props = defineProps({
  color: { type: String, default: null },
});

const spriteSvg = ref('');

const spriteModules = import.meta.glob('../../assets/sprites/**/front.svg?raw');

const getSpriteModule = (color) => {
  const path = color ? `../../assets/sprites/${color}/front.svg?raw` : `../../assets/sprites/front.svg?raw`;
  return spriteModules[path];
};

const loadSprite = async (color) => {
  let getModule = getSpriteModule(color);
  if (!getModule) {
    getModule = getSpriteModule(null);
  }

  if (getModule) {
    const module = await getModule();
    spriteSvg.value = module.default;
  }
};

onMounted(() => {
  loadSprite(props.color);
});

watch(() => props.color, (newColor) => {
  loadSprite(newColor);
});
</script>

<style scoped>
.svg-preview {
  width: 96px;
  height: 144px;
  margin: 0 auto 12px auto;
}
.svg-preview svg {
  width: 100%;
  height: 100%;
  display: block;
  filter: drop-shadow(0 0 4px rgba(0,0,0,0.7));
}
</style>

<template>
  <div class="svg-preview" ref="svgContainer" v-html="spriteSvg"></div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue';
import frontSvg from '../../assets/sprites/front.svg?raw';

const props = defineProps({
  hairColor: { type: String, default: '#000000' },
  tshirtColor: { type: String, default: '#ffffff' },
});

const svgContainer = ref(null);
const spriteSvg = frontSvg;

const PRIMARY_IDS = ['id2', 'id3'];
const HAIR_IDS = ['id1'];

function applyColors() {
  const root = svgContainer.value;
  if (!root) return;
  // Hair
  HAIR_IDS.forEach((id) => {
    const el = root.querySelector(`#${id}`);
    if (el) {
      el.style.fill = props.hairColor;
    }
  });
  // T-shirt (main color)
  PRIMARY_IDS.forEach((id) => {
    const el = root.querySelector(`#${id}`);
    if (el) {
      el.style.fill = props.tshirtColor;
    }
  });
}

onMounted(async () => {
  await nextTick();
  applyColors();
});

watch(() => [props.hairColor, props.tshirtColor], applyColors);
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

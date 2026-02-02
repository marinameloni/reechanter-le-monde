<template>
  <section class="index-landing">
    <Header />
    <div class="game-container">
      <div class="screen-area">
        <div class="slide">
          <img :src="images[current]" alt="game screen" />
        </div>
        
        <div class="dots-container">
          <div class="dots">
            <button v-for="(i, idx) in images" :key="idx" :class="{ active: idx === current }" @click="go(idx)"></button>
          </div>
        </div>
      </div>

      <div class="ui-footer">
        <div class="logo-placeholder">
           <img src="../assets/logo.png" alt="Logo" class="main-logo" />
        </div>
        
        <div class="cta-buttons">
          <button class="btn-create" @click="goCreate">Créer un Robot</button>
          <button class="btn-login" @click="goAuth">Se connecter</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import Header from '../components/ui/Header.vue';
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import screen1 from '../assets/screen1.jpg';
import screen2 from '../assets/screen2.jpg';
import screen3 from '../assets/screen3.jpg';
import screen4 from '../assets/screen4.jpg';

const router = useRouter();
const images = [screen1, screen2, screen3, screen4];
const current = ref(0);

function go(i) { current.value = i; }
function goAuth() { router.push('/auth'); }
function goCreate() { router.push('/create'); }

let autoplay = null;
onMounted(() => { autoplay = setInterval(() => { current.value = (current.value + 1) % images.length; }, 4000); });
onBeforeUnmount(() => { if (autoplay) clearInterval(autoplay); });
</script>

<style>
body {
    background-color: #243726;
}
.index-landing {
  min-height: 100vh;
  background-color: #243726;
  display: block; /* use normal document flow so page can scroll */
  font-family: 'Arial Rounded MT Bold', 'Helvetica', sans-serif;
  padding: 24px 8px; /* more breathing room at top */
  position: relative;
}

.game-container {
  width: 94%;
  max-width: 760px;
  /* allow container to grow naturally and let page scroll */
  position: relative;
  border: 6px solid #5b4a33; /* Earthy brown frame */
  border-radius: 16px;
  overflow: hidden;
  background: #334a37;
  box-shadow: 0 12px 24px rgba(0,0,0,0.22);
  margin: 0 auto;
}

/* Screen area where images play */
.screen-area {
  aspect-ratio: 4 / 3;
  position: relative;
  background: #2f4a36;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.screen-area img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Ensure each slide occupies the same box */
.screen-area .slide {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* The Blue Bottom Bar */
.ui-footer {
  background: #263622;
  height: 84px;
  border-top: 5px solid #5b4a33;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding-bottom: 10px;
}

/* Centered Logo "Tab" */
.logo-placeholder {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  background: #263622;
  padding: 6px 16px;
  border: 5px solid #5b4a33;
  border-bottom: none;
  border-radius: 16px 16px 0 0;
  min-width: 150px;
  text-align: center;
}

.main-logo { height: 50px; } /* Replace with your actual logo img */

/* Buttons Style */
.cta-buttons {
  display: flex;
  gap: 20px;
  width: 90%;
}

.btn-create, .btn-login {
  flex: 1;
  padding: 8px;
  font-size: 1rem;
  font-style: italic;
  font-weight: bold;
  color: white;
  border: 2px solid #3e4a3e;
  border-radius: 10px;
  cursor: pointer;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.45);
  transition: transform 0.1s;
}

.btn-create { background: linear-gradient(#7a8f6d, #2f4a36); }
.btn-login { background: linear-gradient(#7a8f6d, #2f4a36); }

.btn-create:hover, .btn-login:hover {
  transform: scale(1.02);
  filter: brightness(1.1);
}

/* Navigation Dots Styles */
.dots-container {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.4);
  padding: 5px 15px;
  border-radius: 20px;
}

.dots { display: flex; gap: 8px; }
.dots button {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: #999;
  cursor: pointer;
}

.dots button.active {
  background: #b88646; /* Muted ochre */
  transform: scale(1.2);
}

/* Small centered header */
.landing-header {
  position: absolute;
  top: 10px;
  left: 0;
  width: 100%;
  text-align: center;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.45);
  z-index: 60;
  pointer-events: auto;
  margin-bottom: 10px;
}

/* Remove default link styling inside header */
.landing-header a {
  color: inherit;
  text-decoration: none;
  font-weight: 600;
}
.landing-header a:hover {
  text-decoration: underline;
  opacity: 0.95;
}
</style>
<template>
  <header class="site-header">
    <img :src="headerImg" alt="Réechanter le Monde" class="header-banner" />
    <nav class="nav-wrap">
      <ul class="nav-list">
        <li><router-link to="/">Accueil</router-link></li>
        <li><router-link to="/features">Fonctionnalités</router-link></li>
        <li><router-link to="/help">Aide</router-link></li>
        <li><a href="#about">À propos</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    </nav>
  </header>
</template>

<script setup>
import headerImg from '../../assets/header.jpg';
</script>

<style scoped>
/* Match the small centered header from Index.vue */
.site-header {
  position: relative; /* participate in document flow so page can scroll */
  left: 0;
  width: 100%;
  text-align: center;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.45);
  z-index: 70;
  pointer-events: auto;
  margin-bottom: 12px; /* ensure banner doesn't overlap following content */
}
.nav-wrap { width: 100%; max-width: 1030px; margin: 0 auto; }
.nav-list { list-style: none; display: flex; gap: 20px; justify-content: center; align-items: center; padding: 0; margin: 0; }
.nav-list li { font-weight: 700; }
.nav-list a { color: inherit; text-decoration: none; font-weight: 600; padding: 6px 10px; border-radius: 8px; }
.nav-list a:hover { text-decoration: underline; opacity: 0.95; color: #d6a94a; background: rgba(214,169,74,0.06); }
.nav-right { margin-left: auto; }

/* banner image */
.header-banner {
  display: block;
  width: 100%;
    max-width: 1030px; /* match nav width */
    max-height: 140px;
    object-fit: cover;
    margin: 0 auto 0px;
    position: relative;
    z-index: 60;
    margin-bottom: 50px;
}
</style>

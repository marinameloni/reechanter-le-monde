<template>
  <section class="content-page">
    <Header />

    <div class="content-wrapper">
      <h1>Conditions d'utilisation</h1>

      <p>Bienvenue sur Reëchanter le Monde. En utilisant ce service, vous acceptez les présentes conditions d'utilisation. Veuillez lire attentivement ces conditions avant d'utiliser le site.</p>

      <h2>Accès et utilisation</h2>
      <p>Vous vous engagez à utiliser le service conformément aux lois en vigueur et à respecter les règles de conduite. Il est interdit d'utiliser le service pour des activités illégales ou malveillantes.</p>

      <h2>Propriété intellectuelle</h2>
      <p>Tous les contenus fournis sur ce site (textes, images, logos, code) restent la propriété de leurs auteurs respectifs. Toute reproduction non autorisée est interdite.</p>

      <h2>Limitation de responsabilité</h2>
      <p>Le service est fourni tel quel. Nous déclinons toute responsabilité en cas de dommages directs ou indirects résultant de l'utilisation du service.</p>

      <h2>Modifications</h2>
      <p>Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications seront publiées ici et entreront en vigueur immédiatement.</p>
    </div>

    <Footer />
  </section>
</template>

<script setup>
import Header from '../components/ui/Header.vue';
import Footer from '../components/ui/Footer.vue';
</script>

<style scoped>
.content-page { min-height: 100vh; background: #082F45; color: #fff; }
.content-wrapper { max-width: 900px; margin: 40px auto; padding: 24px; background: rgba(255,255,255,0.03); border-radius: 8px; }
.content-wrapper h1 { margin-top: 0; }
.content-wrapper p { line-height: 1.6; }
</style>

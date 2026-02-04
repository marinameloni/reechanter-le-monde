<template>
  <section class="content-page">
    <Header />

    <div class="content-wrapper">
      <h1>Politique de confidentialité</h1>

      <p>La protection de vos données est importante pour nous. Cette politique décrit quelles informations nous collectons, comment nous les utilisons et les droits dont vous disposez.</p>

      <h2>Informations collectées</h2>
      <p>Nous pouvons collecter des informations telles que votre nom d'utilisateur, adresse e-mail et données de jeu nécessaires au fonctionnement du service.</p>

      <h2>Utilisation des données</h2>
      <p>Les données sont utilisées pour fournir et améliorer le service, pour la gestion des comptes et pour des communications liées au produit. Nous ne vendons pas vos données à des tiers.</p>

      <h2>Sécurité</h2>
      <p>Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables pour protéger vos informations contre l'accès non autorisé.</p>

      <h2>Contact</h2>
      <p>Pour toute question sur la confidentialité, veuillez nous contacter via l'adresse fournie sur le site.</p>
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

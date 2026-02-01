<template>
  <section class="features-page">
    <Header />
    <header class="features-header">
      <h1>Fonctionnalités du site</h1>
      <p class="lead">Liste complète et détaillée de tout ce que vous pouvez faire ici.</p>
    </header>

    <main class="features-main">
      <article>
        <h2>Compte & Authentification</h2>
        <ul>
          <li>Créer un compte utilisateur (inscription).</li>
          <li>Se connecter / se déconnecter.</li>
          <li>Prévisualiser le robot avant création (aperçu du sprite + couleur).</li>
          <li>Modifier la couleur de son robot depuis l'espace de jeu.</li>
          <li>Rôles administrateur : accès à la page Admin si `isAdmin`.</li>
        </ul>
      </article>

      <article>
        <h2>Création & personnalisation</h2>
        <ul>
          <li>Page de création de robot avec sélection de couleur.</li>
          <li>Affichage inline des SVG du sprite correspondant à la couleur choisie.</li>
          <li>Validation et sauvegarde du profil utilisateur (username, couleur, etc.).</li>
        </ul>
      </article>

      <article>
        <h2>Jeu (carte & interaction)</h2>
        <ul>
          <li>Rejoindre une salle de jeu temps réel (Colyseus) pour la carte choisie.</li>
          <li>Déplacement du robot sur la carte (mouvement joueur local et autres joueurs visibles).</li>
          <li>Cliquer sur des tuiles pour effectuer des actions (usine, arrosage, récolte, construction).</li>
          <li>Zones spéciales selon la carte :
            <ul>
              <li>Map 1 : progression d'usine (clicks sur la factory).</li>
              <li>Map 3 : plantations / arrosage (fleurs).</li>
              <li>Map 4 : collecte de bois et construction de clôtures.</li>
              <li>Map 5 : chantiers de maisons (contribuer au progrès des maisons).</li>
            </ul>
          </li>
          <li>Superpositions d'images (NPC, portes, portails, fleurs, maisons).</li>
          <li>Système de tuiles bloquées et zones non franchissables.</li>
        </ul>
      </article>

      <article>
        <h2>Interaction entre joueurs</h2>
        <ul>
          <li>Voir la liste des joueurs connectés et leurs sprites en temps réel.</li>
          <li>Bulles de chat au-dessus des joueurs (messages temporaires affichés en bulle).</li>
          <li>Chat in-map (barre de chat en bas-centre) pour envoyer des messages en temps réel.</li>
          <li>Ouvrir la fiche d'un joueur et proposer/composer des échanges (trade requests & offers).</li>
          <li>Négociation d'échanges : proposer, contre-proposer, confirmer, exécuter l'échange.</li>
        </ul>
      </article>

      <article>
        <h2>Économie & inventaire</h2>
        <ul>
          <li>Ressources locales : briques, pierres, bois, outils (arrosoir, pelle, engrais, ...).</li>
          <li>Progression locale partagée (ex : factory clicks partagés entre joueurs).</li>
          <li>Inventaire visible dans le HUD et fiche joueur (slots, compteurs, icônes).</li>
          <li>Achat d'objets via NPC (e.g., Watering Can, Shovel, Fertilizer) en échange de ressources.</li>
          <li>Contribuer à la construction (houses) en dépensant ressources.</li>
        </ul>
      </article>

      <article>
        <h2>Effets & audio</h2>
        <ul>
          <li>Musique de fond persistante (BG music) jouée en continu lors de la navigation.</li>
          <li>Effets sonores (SFX) pour actions : clics d'usine, plantation, etc.</li>
          <li>Paramètres audio dans le modal `Settings` (activer/désactiver musique et SFX, sauvegarde locale).</li>
        </ul>
      </article>

      <article>
        <h2>UI & accessibilité</h2>
        <ul>
          <li>Thème visuel « earthy » appliqué au site (couleurs principales et accents).</li>
          <li>Boutons, modals, barres et cartes stylisées (HUD, inventory panel, settings, exchange modal).</li>
          <li>Prévisualisation des sprites inline (SVG) dans les formulaires et fiches.</li>
          <li>Bannières et notifications temporaires (success / warning / error).</li>
        </ul>
      </article>

      <article>
        <h2>Administration</h2>
        <ul>
          <li>Page Admin réservée aux comptes administrateurs.</li>
          <li>Outils d'administration (gérer joueurs, cartes, données) — implémentation coté serveur requise.</li>
        </ul>
      </article>

      <article>
        <h2>Techniques & développement</h2>
        <ul>
          <li>Frontend : Vue 3 + Vite, composants SFC, import dynamique d'assets (Vite raw SVG imports).</li>
          <li>Backend : API REST et room temps réel (Colyseus) pour la synchronisation multi-joueurs.</li>
          <li>Assets : sprites SVG par couleur, maps JSON et images, fichiers audio pour musique/SFX.</li>
          <li>Déploiement prévu via Docker / nginx (frontend proxied derrière `/api` et colyseus routes).</li>
        </ul>
      </article>

      <article>
        <h2>Limitations connues / dépendances</h2>
        <ul>
          <li>Certains endpoints serveur (ex: recherche joueur par username pour prévisualisation) peuvent manquer côté API.</li>
          <li>Vérification visuelle recommandée : lancer le serveur de dev pour confirmer rendu & audio.</li>
          <li>Déploiement Docker/Compose peut nécessiter ajustements (Node version, proxys nginx, variables d'environnement).</li>
        </ul>
      </article>

      <footer class="features-footer">
        <p>Si vous voulez que j'ajoute une fonctionnalité manquante ou que je détaille une fonctionnalité, dites laquelle.</p>
      </footer>
    </main>
  </section>
</template>

<script setup>
import Header from '../components/ui/Header.vue';
// Simple static page — no script logic required for now
</script>

<style scoped>
.features-page { padding: 24px; background: #243726; color: #fff; min-height: 100vh; }
.features-header { max-width: 980px; margin: 0 auto 18px; }
.features-header h1 { margin: 0 0 8px; color: #d6a94a; }
.lead { color: #dfeadb; margin: 0 0 12px; }
.features-main { max-width: 980px; margin: 0 auto; background: #334a37; padding: 20px; border: 1px solid #5b4a33; border-radius: 12px; }
.features-main h2 { color: #d6a94a; margin-top: 12px; }
.features-main ul { margin: 6px 0 12px 18px; }
.features-footer { margin-top: 18px; color: #e6e6d8; }
</style>

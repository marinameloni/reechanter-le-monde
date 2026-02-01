<template>
	<section class="help-page">
		<Header />
		<main class="help-main">
			<h1>Guide rapide — Tutoriel</h1>
			<p class="lead">Bienvenue ! Ce guide explique en français comment utiliser le site et jouer.</p>

			<section>
				<h2>1. Création de compte et connexion</h2>
				<ol>
					<li>Allez sur <router-link to="/create">Créer un Robot</router-link> pour ouvrir le formulaire d'inscription.</li>
					<li>Choisissez un nom d'utilisateur, un mot de passe et une couleur pour votre robot.</li>
					<li>Après la création, vous êtes redirigé vers la page de jeu (`/game`).</li>
					<li>Si vous avez déjà un compte, connectez-vous via <router-link to="/auth">Se connecter</router-link>.</li>
				</ol>
			</section>

			<section>
				<h2>2. Navigation dans le jeu</h2>
				<ul>
					<li>Une fois dans la zone de jeu, la carte se charge automatiquement et vous rejoignez une salle temps réel.</li>
					<li>Votre robot apparaît avec la couleur choisie. Les autres joueurs sont visibles en temps réel.</li>
					<li>Cliquez sur les tuiles de la carte pour interagir : usine (factory), arrosage, constructions, NPC, etc.</li>
					<li>Certaines tuiles sont bloquées — l'interface montre les zones spéciales par carte (Map 1→5).</li>
				</ul>
			</section>

			<section>
				<h2>3. Chat et communication</h2>
				<ul>
					<li>Utilisez la barre de chat en bas-centre pour envoyer des messages à tous les joueurs de la salle.</li>
					<li>Les messages apparaissent aussi en bulle au-dessus des joueurs pendant quelques secondes.</li>
					<li>Exemple : tapez votre message et appuyez sur Entrée ou cliquez sur « Send ».</li>
				</ul>
			</section>

			<section>
				<h2>4. Économie, inventaire et échanges</h2>
				<ul>
					<li>Ramassez des ressources (briques, pierres, bois) en interagissant avec la carte.</li>
					<li>Ouvrez la fiche d'un joueur pour proposer un échange (trade request).</li>
					<li>Vous pouvez proposer une offre, recevoir une contre-proposition, puis confirmer l'échange.</li>
					<li>Les objets du NPC peuvent être achetés contre des ressources locales.</li>
				</ul>
			</section>

			<section>
				<h2>5. Personnalisation</h2>
				<ul>
					<li>Changez la couleur de votre robot depuis votre fiche joueur dans le jeu.</li>
					<li>La prévisualisation de sprite montre le rendu exact du SVG pour la couleur choisie.</li>
				</ul>
			</section>

			<section>
				<h2>6. Astuces et bonnes pratiques</h2>
				<ul>
					<li>Sauvegardez bien votre mot de passe — le site n'affiche pas le mot de passe en clair.</li>
					<li>Activez/désactivez la musique ou les SFX depuis le modal « Settings » si besoin.</li>
					<li>Si la carte ne s'affiche pas correctement, rechargez la page et vérifiez la console du navigateur.</li>
				</ul>
			</section>

			<footer class="help-footer">
				<p>Besoin d'un complément ? Dis-moi quelle fonctionnalité tu veux documenter davantage.</p>
			</footer>
		</main>
	</section>
</template>

<script setup>
import Header from '../components/ui/Header.vue';
</script>

<style scoped>
.help-page { min-height: 100vh; background: #243726; color: #fff; padding-bottom: 40px;  }
.help-main { max-width: 980px; margin: 24px auto; background: #334a37; padding: 22px; border-radius: 12px; border: 1px solid #5b4a33; margin-top: 4rem; }
.help-main h1 { color: #d6a94a; margin-top: 4px; }
.lead { color: #dfeadb; }
.help-main h2 { color: #d6a94a; margin-top: 12px; }
.help-main ul, .help-main ol { margin-left: 18px; }
.help-footer { margin-top: 18px; color: #e6e6d8; }
</style>


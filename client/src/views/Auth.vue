<template>
  <section class="index-landing">
    <Header />

    <div class="game-container">
      <div class="auth-content">
        
        <div class="player-card">
          <div class="card-inner">
            <div class="sprite-container">
               <SignupSpritePreview v-if="previewUser" :color="previewUser.color" />
               <div v-else class="robot-placeholder">
                 <img :src="robotPlaceholder" alt="robot" class="robot-img" />
               </div>
            </div>
            <h2 class="display-name">
              {{ previewUser?.username || loginForm.username || 'ROBOT' }}
            </h2>
          </div>
        </div>

        <div class="form-container">
          <div class="form-area">
            <label>Nom d'utilisateur :</label>
            <input v-model="loginForm.username" placeholder="Nom d'utilisateur" class="cp-input" />
            <label>Mot de passe :</label>
            <input v-model="loginForm.password" type="password" placeholder="Mot de passe" class="cp-input" />
            
            <div class="checkbox-group">
              <label><input type="checkbox" v-model="rememberMe"> Se souvenir de moi sur cet ordinateur</label>
              <label><input type="checkbox" v-model="rememberPassword"> Mémoriser mon mot de passe</label>
            </div>

            <button class="btn-cp-login" @click="handleLogin">Se connecter</button>
            
            <div class="secondary-links">
              <a href="#" @click.prevent="showForgotModal = true">Mot de passe oublié ?</a>
              <a href="#" @click.prevent="forgetRobot">Oublier mon robot</a>
            </div>

            <div v-if="showForgotModal" class="forgot-modal">
              <div class="forgot-inner">
                <h3>Mot de passe oublié ?</h3>
                <p>Entrez votre e-mail pour recevoir les instructions de réinitialisation.</p>
                <input v-model="forgotEmail" placeholder="E-mail" class="cp-input" />
                <div style="display:flex;gap:8px;margin-top:10px;">
                  <button class="btn-cp-login" @click="sendForgot" :disabled="forgotSending">Envoyer</button>
                  <button class="btn close" @click="showForgotModal=false">Fermer</button>
                </div>
                <p class="hint" v-if="forgotMessage">{{ forgotMessage }}</p>
              </div>
            </div>
          </div>

          
          <!-- signup moved to CreateRobot page -->
          

          <div class="sticky-note">
            NE PARTAGEZ PAS VOTRE MOT DE PASSE
          </div>
        </div>
      </div>

      <div class="ui-footer">
        <div class="logo-placeholder">
          <img src="../assets/logo.png" alt="Logo" class="main-logo" />
        </div>
        <button class="switch-mode-btn" @click="router.push('/create')">
          Créer un robot
        </button>
      </div>
    </div>
  
    <Footer />
  </section>
</template>

<script setup>
import { reactive, ref, watch, onBeforeUnmount, onMounted } from 'vue';
import Header from '../components/ui/Header.vue';
import Footer from '../components/ui/Footer.vue';
import SignupSpritePreview from '../components/game/SignupSpritePreview.vue';
import robotPlaceholder from '../assets/sprites/default/front.svg';
import api from '../services/api';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/auth.store';

const router = useRouter();
const auth = useAuthStore();

const loginForm = reactive({
  username: '',
  password: ''
});

// Remember / forgot controls
const rememberMe = ref(false);
const rememberPassword = ref(false);
const showForgotModal = ref(false);
const forgotEmail = ref('');
const forgotMessage = ref('');
const forgotSending = ref(false);

const signupForm = reactive({
  username: '',
  email: '',
  password: '',
  color: 'red',
});

const availableColors = ['blue', 'green', 'orange', 'pink', 'purple', 'red', 'turquoise', 'yellow'];

const previewUser = ref(null);
let lookupTimer = null;

// load saved credentials & flags
onMounted(() => {
  try {
    const rm = localStorage.getItem('rememberMe');
    const rp = localStorage.getItem('rememberPassword');
    rememberMe.value = rm === 'true';
    rememberPassword.value = rp === 'true';

    const raw = localStorage.getItem('savedCredentials');
    if (raw) {
      const creds = JSON.parse(raw);
      if (creds?.username && rememberMe.value) loginForm.username = creds.username;
      if (creds?.password && rememberPassword.value) loginForm.password = creds.password;
    }
  } catch (e) {
    // ignore storage errors
  }
});

const lookupUsername = async (name) => {
  previewUser.value = null;
  if (!name || name.length < 2) return;
  try {
    const res = await api.get(`/player/username/${encodeURIComponent(name)}`);
    // expect { success:true, player: { username, color, id_player }}
    const player = res.data?.player || res.data?.user || null;
    if (player) previewUser.value = { username: player.username, color: player.color };
  } catch (err) {
    // not found or no endpoint — silently ignore
    previewUser.value = null;
  }
};

// debounce watcher
watch(() => loginForm.username, (val) => {
  if (lookupTimer) clearTimeout(lookupTimer);
  lookupTimer = setTimeout(() => lookupUsername(val.trim()), 300);
});

onBeforeUnmount(() => {
  if (lookupTimer) clearTimeout(lookupTimer);
});

const handleLogin = async () => {
  await auth.login({ username: loginForm.username, password: loginForm.password });
  if (!auth.user) return;
  // persist remember settings
  try {
    if (rememberMe.value) localStorage.setItem('rememberMe', 'true'); else localStorage.removeItem('rememberMe');
    if (rememberPassword.value) localStorage.setItem('rememberPassword', 'true'); else localStorage.removeItem('rememberPassword');

    if (rememberMe.value) {
      const toSave = { username: loginForm.username };
      if (rememberPassword.value) toSave.password = loginForm.password;
      localStorage.setItem('savedCredentials', JSON.stringify(toSave));
    } else {
      localStorage.removeItem('savedCredentials');
    }
  } catch (e) {}
  router.push('/game');
};

const handleSignup = async () => {
  await auth.signup(signupForm);
  if (!auth.user) return;
  router.push('/game');
};

// signup is handled on separate CreateRobot page

const forgetRobot = () => {
  try {
    localStorage.removeItem('savedRobot');
    localStorage.removeItem('signup_draft');
    localStorage.removeItem('savedSignup');
  } catch (e) {}
  previewUser.value = null;
  // give quick feedback
  try { alert('Robot supprimé localement.'); } catch (_) {}
};

const sendForgot = async () => {
  forgotMessage.value = '';
  if (!forgotEmail.value) { forgotMessage.value = 'Veuillez entrer un e-mail.'; return; }
  forgotSending.value = true;
  try {
    // best-effort endpoint; backend may implement /api/auth/forgot
    const res = await api.post('/api/auth/forgot', { email: forgotEmail.value });
    if (res.data?.success) {
      forgotMessage.value = "E-mail de réinitialisation envoyé si l'adresse existe.";
    } else {
      forgotMessage.value = res.data?.message || 'Demande envoyée.';
    }
  } catch (err) {
    forgotMessage.value = err.response?.data?.message || "Impossible d'envoyer l'e-mail de réinitialisation.";
  } finally {
    forgotSending.value = false;
  }
};
</script>

<style scoped>

.index-landing {
  min-height: 100vh;
  background-color: #1B7FA3;
  display: block;
  justify-content: center;
  align-items: center;
  font-family: 'Arial Rounded MT Bold', 'Helvetica', sans-serif;
}

.game-container {
  width: 900px;
  height: 550px;
  position: relative;
  border: 6px solid #FFCF4D;
  border-radius: 20px;
  background: #082F45;
  display: flex;
  flex-direction: column;
}

.auth-content {
  display: flex;
  flex: 1;
  padding: 40px;
  gap: 40px;
  align-items: center;
}

/* Player Card Styles */
.player-card {
  flex: 1;
  background: #fff;
  padding: 5px;
  border-radius: 18px;
  height: 350px;
  max-width: 280px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
}

.card-inner {
  background: #082F45;
  height: 100%;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-around;
}

.display-name {
  color: white;
  text-transform: uppercase;
  font-style: italic;
  font-size: 2rem;
  margin: 0;
  text-shadow: 2px 2px 0px rgba(0,0,0,0.3);
}

.robot-placeholder { width: 100px; height: 150px; background: rgba(255,255,255,0.1); border-radius: 20px; }

.robot-img { width: 120px; height: auto; display: block; }

.form-container { flex: 1; position: relative; color: white; }
.form-area label { display: block; margin-bottom: 5px; font-weight: bold; }

.cp-input {
  width: 100%;
  padding: 10px;
  border: 2px solid #048BA8;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 1.1rem;
  background: rgba(255,255,255,0.02);
  color: #fff;
}

.checkbox-group { font-size: 0.9rem; margin-bottom: 20px; }
.checkbox-group label { font-weight: normal; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;}

.btn-cp-login {
  background: linear-gradient(#19A9EE, #048BA8);
  border: 3px solid #048BA8;
  border-radius: 50px;
  color: white;
  padding: 10px 40px;
  font-size: 1.4rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 0 #FFCF4D;
}

.btn-cp-login:active { transform: translateY(2px); box-shadow: 0 2px 0 #FFCF4D; }

.secondary-links { margin-top: 20px; display: flex; flex-direction: column; gap: 5px; }
.secondary-links a { color: white; text-decoration: none; font-size: 0.9rem; }

.sticky-note {
  position: absolute;
  bottom: -60px;
  right: -20px;
  background: #d6a94a;
  color: #333;
  padding: 15px;
  width: 140px;
  font-size: 0.8rem;
  font-weight: bold;
  transform: rotate(5deg);
  box-shadow: 5px 5px 10px rgba(0,0,0,0.2);
  text-align: center;
  border-bottom-right-radius: 30px 5px;
}

.forgot-modal {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.5);
  z-index: 300;
}
.forgot-inner {
  background: #082F45;
  padding: 20px;
  border-radius: 8px;
  width: 360px;
  color: #fff;
}

.ui-footer { 
  background: #082F45; 
  height: 80px; 
  border-top: 6px solid #FFCF4D; 
  display: flex; 
  justify-content: center; 
  align-items: flex-end; 
  padding-bottom: 10px;
}

.switch-mode-btn {
  background: none;
  border: none;
  color: white;
  text-decoration: underline;
  cursor: pointer;
  font-size: 1rem;
}

.color-selector { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
.color-option { width: 20px; height: 20px; border-radius: 4px; cursor: pointer; border: 1px solid #fff; }

.landing-header { position: absolute; top: 20px; width: 100%; }
.landing-header ul { display: flex; gap: 20px; justify-content: center; list-style: none; }
.landing-header a { color: white; text-decoration: none; font-weight: bold; }
</style>

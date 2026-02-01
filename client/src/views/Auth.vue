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
            <label>Username:</label>
            <input v-model="loginForm.username" placeholder="Username" class="cp-input" />
            <label>Password:</label>
            <input v-model="loginForm.password" type="password" class="cp-input" />
            
            <div class="checkbox-group">
              <label><input type="checkbox"> Remember me on this computer</label>
              <label><input type="checkbox"> Remember my password</label>
            </div>

            <button class="btn-cp-login" @click="handleLogin">Login</button>
            
            <div class="secondary-links">
              <a href="#">Forgot your password?</a>
              <a href="#">Forget my robot</a>
            </div>
          </div>

          
          <!-- signup moved to CreateRobot page -->
          

          <div class="sticky-note">
            KEEP YOUR PASSWORD A SECRET
          </div>
        </div>
      </div>

      <div class="ui-footer">
        <div class="logo-placeholder">
          <img src="../assets/logo.png" alt="Logo" class="main-logo" />
        </div>
        <button class="switch-mode-btn" @click="router.push('/create')">
          Create a Robot
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref, watch, onBeforeUnmount } from 'vue';
import Header from '../components/ui/Header.vue';
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

const signupForm = reactive({
  username: '',
  email: '',
  password: '',
  color: 'red',
});

const availableColors = ['blue', 'green', 'orange', 'pink', 'purple', 'red', 'turquoise', 'yellow'];

const previewUser = ref(null);
let lookupTimer = null;

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
  router.push('/game');
};

const handleSignup = async () => {
  await auth.signup(signupForm);
  if (!auth.user) return;
  router.push('/game');
};

// signup is handled on separate CreateRobot page
</script>

<style scoped>

.index-landing {
  min-height: 100vh;
  background-color: #243726;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'Arial Rounded MT Bold', 'Helvetica', sans-serif;
}

.game-container {
  width: 900px;
  height: 550px;
  position: relative;
  border: 6px solid #5b4a33;
  border-radius: 20px;
  background: #38523c;
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
  background: #2f4a36;
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
  border: 2px solid #3e4a3e;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 1.1rem;
  background: rgba(255,255,255,0.02);
  color: #fff;
}

.checkbox-group { font-size: 0.9rem; margin-bottom: 20px; }
.checkbox-group label { font-weight: normal; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;}

.btn-cp-login {
  background: linear-gradient(#7a8f6d, #2f4a36);
  border: 3px solid #3e4a3e;
  border-radius: 50px;
  color: white;
  padding: 10px 40px;
  font-size: 1.4rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 0 #5b4a33;
}

.btn-cp-login:active { transform: translateY(2px); box-shadow: 0 2px 0 #5b4a33; }

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

.ui-footer { 
  background: #263622; 
  height: 80px; 
  border-top: 6px solid #5b4a33; 
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

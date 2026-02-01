<template>
  <section class="index-landing">
    <Header />

    <div class="game-container">
      <div class="auth-content">
        <div class="player-card">
          <div class="card-inner" :style="{ '--accent': signupForm.color }">
            <div class="sprite-container">
              <div v-if="previewSvg" class="svg-preview" v-html="previewSvg"></div>
              <div v-else class="svg-preview" v-html="frontSvg"></div>
            </div>
            <h2 class="display-name">{{ signupForm.username || 'NEW ROBOT' }}</h2>
          </div>
        </div>

        <div class="form-container">
          <div class="form-area signup-scroll">
            <h2>Create Robot</h2>
            <input v-model="signupForm.username" placeholder="Username" class="cp-input" />
            <input v-model="signupForm.email" placeholder="Email" class="cp-input" />
            <input v-model="signupForm.password" type="password" placeholder="Password" class="cp-input" />

            <p>Robot Color:</p>
            <div class="color-selector">
              <div
                v-for="c in availableColors" :key="c"
                class="color-option"
                :class="{ selected: signupForm.color === c }"
                :style="{ backgroundColor: c }"
                @click="selectColor(c)"
              ></div>
            </div>
            <button class="btn-cp-login" @click="handleSignup">Create</button>
          </div>

          <div class="sticky-note">
            KEEP YOUR PASSWORD A SECRET
          </div>
        </div>
      </div>

      <div class="ui-footer">
        <div class="logo-placeholder">
          <img src="../assets/logo.png" alt="Logo" class="main-logo" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref, watch, onMounted } from 'vue';
import Header from '../components/ui/Header.vue';
import SignupSpritePreview from '../components/game/SignupSpritePreview.vue';
import frontDefault from '../assets/sprites/default/front.svg?raw';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/auth.store';

// load all front.svg files as raw strings (eager import) using the same pattern as in PlayerSprite.vue
const spriteModules = import.meta.glob('/src/assets/sprites/**/front.svg', { query: '?raw', import: 'default', eager: true });

// build a map from color folder -> raw SVG string
const spriteMap = {};
for (const p in spriteModules) {
  const m = p.match(/\/src\/assets\/sprites\/([^\/]+)\/front\.svg$/);
  if (m) spriteMap[m[1]] = spriteModules[p];
}

const router = useRouter();
const auth = useAuthStore();

const signupForm = reactive({ username: '', email: '', password: '', color: 'red' });
const availableColors = ['blue', 'green', 'orange', 'pink', 'purple', 'red', 'turquoise', 'yellow'];

const previewSvg = ref('');
const frontSvg = ref(frontDefault);

const loadPreview = async (color) => {
  previewSvg.value = '';
  // use the provided default raw SVG as fallback
  frontSvg.value = frontDefault;
  if (!color) return;
  const svgRaw = spriteMap[color];
  if (!svgRaw) return;
  // spriteModules is eager so values are raw strings
  previewSvg.value = svgRaw;
};

const selectColor = (c) => {
  signupForm.color = c;
  loadPreview(c);
};

watch(() => signupForm.color, (c) => { loadPreview(c); });
onMounted(() => loadPreview(signupForm.color));

const handleSignup = async () => {
  await auth.signup(signupForm);
  if (!auth.user) return;
  router.push('/game');
};
</script>

<style scoped>
.index-landing { min-height: 100vh; background-color: #243726; display: flex; justify-content: center; align-items: center; font-family: 'Arial Rounded MT Bold', 'Helvetica', sans-serif; }
.game-container { width: 900px; height: 550px; position: relative; border: 6px solid #5b4a33; border-radius: 20px; background: #38523c; display: flex; flex-direction: column; }
.auth-content { display: flex; flex: 1; padding: 40px; gap: 40px; align-items: center; }
.player-card { flex: 1; background: #fff; padding: 5px; border-radius: 18px; height: 350px; max-width: 280px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
.card-inner { background: #2f4a36; height: 100%; border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: space-around; overflow: hidden; position: relative; }
.display-name { color: white; text-transform: uppercase; font-style: italic; font-size: 2rem; margin: 0; text-shadow: 2px 2px 0px rgba(0,0,0,0.3); }
.robot-placeholder { width: 100px; height: 150px; background: rgba(255,255,255,0.05); border-radius: 20px; }
.sprite-container { width: 120px; height: 160px; display: flex; align-items: center; justify-content: center; }

/* Inline svg preview styling - constrain to sprite container */
.svg-preview { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.svg-preview svg { max-width: 100%; max-height: 100%; display: block; }
.form-container { flex: 1; position: relative; color: white; }
.cp-input { width: 100%; padding: 10px; border: 2px solid #3e4a3e; color: #fff; border-radius: 4px; margin-bottom: 15px; font-size: 1.1rem; background: rgba(255,255,255,0.02); }
.checkbox-group { font-size: 0.9rem; margin-bottom: 20px; }
.btn-cp-login { background: linear-gradient(#7a8f6d, #2f4a36); border: 3px solid #3e4a3e; border-radius: 50px; color: white; padding: 10px 40px; font-size: 1.4rem; font-weight: bold; cursor: pointer; box-shadow: 0 4px 0 #5b4a33; }
.btn-cp-login:active { transform: translateY(2px); box-shadow: 0 2px 0 #5b4a33; }
.secondary-links { margin-top: 20px; display: flex; flex-direction: column; gap: 5px; }
.secondary-links a { color: white; text-decoration: none; font-size: 0.9rem; }
.sticky-note { position: absolute; bottom: -60px; right: -20px; background: #d6a94a; color: #333; padding: 15px; width: 140px; font-size: 0.8rem; font-weight: bold; transform: rotate(5deg); box-shadow: 5px 5px 10px rgba(0,0,0,0.2); text-align: center; border-bottom-right-radius: 30px 5px; }
.ui-footer { background: #263622; height: 80px; border-top: 6px solid #5b4a33; display: flex; justify-content: center; align-items: flex-end; padding-bottom: 10px; }
.switch-mode-btn { background: none; border: none; color: white; text-decoration: underline; cursor: pointer; font-size: 1rem; }
.color-selector { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
.color-option { width: 20px; height: 20px; border-radius: 4px; cursor: pointer; border: 1px solid #fff; }
.color-option.selected { outline: 3px solid rgba(0,0,0,0.12); transform: scale(1.08); }
.landing-header { position: absolute; top: 20px; width: 100%; }
.landing-header ul { display: flex; gap: 20px; justify-content: center; list-style: none; }
.landing-header a { color: white; text-decoration: none; font-weight: bold; }
</style>
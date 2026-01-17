<template>
    <section>
  <div class="auth-page">
    <div class="login">
      <h2>Login</h2>
      <input v-model="loginForm.username" placeholder="Username" />
      <input v-model="loginForm.password" type="password" placeholder="Password" />
      <button @click="handleLogin">Login</button>
      <p v-if="loginError" class="error">{{ loginError }}</p>
    </div>

    <div class="signup">
      <h2>Sign Up</h2>
      <input v-model="signupForm.username" placeholder="Username" />
      <input v-model="signupForm.email" placeholder="Email" />
      <input v-model="signupForm.password" type="password" placeholder="Password" />

      <div class="character">
        <p>Gender:</p>
        <label><input type="radio" value="female" v-model="signupForm.character_gender" /> Female</label>
        <label><input type="radio" value="male" v-model="signupForm.character_gender" /> Male</label>

        <p>Hair Color:</p>
        <input type="color" v-model="signupForm.hair_color" />

        <p>T-shirt Color:</p>
        <input type="color" v-model="signupForm.tshirt_color" />
      </div>

      <button @click="handleSignup">Sign Up</button>
      <p v-if="signupError" class="error">{{ signupError }}</p>
    </div>
  </div>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue';
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
  character_gender: 'female',
  hair_color: '#ff0000',
  tshirt_color: '#0000ff'
});

const loginError = ref('');
const signupError = ref('');

const handleLogin = async () => {
  loginError.value = '';
  const success = await auth.login(loginForm.username, loginForm.password);
  if (!success) {
    loginError.value = 'Invalid credentials';
    return;
  }

  // Redirection vers la partie après login réussi
  router.push('/game');
};

const handleSignup = async () => {
  signupError.value = '';
  const success = await auth.signup(signupForm);
  if (!success) {
    signupError.value = 'Signup failed';
    return;
  }

  // Après inscription on enchaîne directement sur le jeu
  router.push('/game');
};
</script>

<style scoped>
.auth-page {
  display: flex;
  width: 90%;
  max-width: 1000px;
  margin: 50px auto;
  gap: 40px;
}

.login, .signup {
  flex: 1;
  padding: 20px;
  border: 2px solid #333;
  border-radius: 10px;
  background: #f4f4f4;
}

.character p {
  margin: 10px 0 5px;
}

input[type="text"], input[type="password"], input[type="email"], input[type="color"] {
  display: block;
  width: 100%;
  margin-bottom: 15px;
  padding: 8px;
}

button {
  padding: 10px 15px;
  cursor: pointer;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 5px;
}

button:hover {
  background-color: #45a049;
}

.error {
  color: red;
  margin-top: 10px;
}
</style>

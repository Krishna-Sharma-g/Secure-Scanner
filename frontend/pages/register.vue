<script setup lang="ts">
definePageMeta({ layout: false });

const { register } = useAuth();

const name = ref('');
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const handleRegister = async () => {
  error.value = '';
  loading.value = true;
  try {
    await register(name.value, email.value, password.value);
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || 'Registration failed';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-brand">SecureScanner</div>
      <h2>Create account</h2>
      <p class="muted">Sign up to start scanning for vulnerabilities.</p>

      <div v-if="error" class="auth-error">{{ error }}</div>

      <form @submit.prevent="handleRegister" class="auth-form">
        <label>
          <span>Name</span>
          <input v-model="name" type="text" placeholder="Your name" required autofocus />
        </label>
        <label>
          <span>Email</span>
          <input v-model="email" type="email" placeholder="you@example.com" required />
        </label>
        <label>
          <span>Password</span>
          <input v-model="password" type="password" placeholder="Min. 8 characters" required minlength="8" />
        </label>
        <button type="submit" class="auth-btn" :disabled="loading">
          {{ loading ? 'Creating account...' : 'Create account' }}
        </button>
      </form>

      <p class="auth-switch">
        Already have an account? <NuxtLink to="/login">Sign in</NuxtLink>
      </p>
    </div>
  </div>
</template>

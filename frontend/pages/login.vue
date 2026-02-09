<script setup lang="ts">
definePageMeta({ layout: false });

const { login } = useAuth();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const handleLogin = async () => {
  error.value = '';
  loading.value = true;
  try {
    await login(email.value, password.value);
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || 'Login failed';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-brand">SecureScanner</div>
      <h2>Sign in</h2>
      <p class="muted">Enter your credentials to access the dashboard.</p>

      <div v-if="error" class="auth-error">{{ error }}</div>

      <form @submit.prevent="handleLogin" class="auth-form">
        <label>
          <span>Email</span>
          <input v-model="email" type="email" placeholder="you@example.com" required autofocus />
        </label>
        <label>
          <span>Password</span>
          <input v-model="password" type="password" placeholder="Enter password" required />
        </label>
        <button type="submit" class="auth-btn" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>

      <p class="auth-switch">
        Don't have an account? <NuxtLink to="/register">Create one</NuxtLink>
      </p>
    </div>
  </div>
</template>

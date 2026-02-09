<script setup lang="ts">
const { isLoggedIn, user, init, logout } = useAuth();
const { init: initProjects } = useProject();

onMounted(() => {
  init();
  initProjects();
});
</script>

<template>
  <div class="page">
    <aside class="sidebar">
      <div class="brand">SecureScanner</div>
      <nav class="nav">
        <NuxtLink to="/">Dashboard</NuxtLink>
        <NuxtLink to="/projects">Projects</NuxtLink>
        <NuxtLink to="/scans">Scans</NuxtLink>
        <NuxtLink to="/vulnerabilities">Vulnerabilities</NuxtLink>
      </nav>

      <div class="sidebar-bottom">
        <template v-if="isLoggedIn && user">
          <div class="user-info">
            <div class="user-avatar">{{ user.name.charAt(0).toUpperCase() }}</div>
            <div class="user-details">
              <div class="user-name">{{ user.name }}</div>
              <div class="user-role">{{ user.role }}</div>
            </div>
          </div>
          <button class="logout-btn" @click="logout">Sign out</button>
        </template>
        <template v-else>
          <NuxtLink to="/login" class="auth-link">Sign in</NuxtLink>
          <NuxtLink to="/register" class="auth-link secondary">Create account</NuxtLink>
        </template>
      </div>
    </aside>
    <main class="content">
      <NuxtPage />
    </main>
  </div>
</template>

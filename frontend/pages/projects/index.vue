<script setup lang="ts">
const { authFetch, isLoggedIn, ready } = useAuth();
const { currentProjectId, setCurrentProject } = useProject();
const projects = ref<any[]>([]);
const name = ref('');
const error = ref<string | null>(null);

const loadProjects = async () => {
  if (!isLoggedIn.value) {
    projects.value = [];
    return;
  }
  try {
    projects.value = await authFetch<any[]>('/api/projects');
    error.value = null;
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  }
};

const createProject = async () => {
  if (!name.value.trim()) return;
  try {
    const project = await authFetch<any>('/api/projects', {
      method: 'POST',
      body: { name: name.value.trim() },
    });
    name.value = '';
    await loadProjects();
    if (project?.id) setCurrentProject(project.id);
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  }
};

watch([ready, isLoggedIn], ([isReady, logged]) => {
  if (isReady && logged) loadProjects();
});
</script>

<template>
  <section>
    <div class="header">
      <div>
        <h1>Projects</h1>
        <p class="muted">Create and switch between projects.</p>
      </div>
    </div>

    <div class="card" style="margin-bottom: 16px;">
      <div class="filters">
        <label>
          Project name
          <input v-model="name" placeholder="my-app" style="padding:8px 10px;border-radius:10px;border:1px solid var(--border);" />
        </label>
        <button class="card" style="padding:10px 14px;cursor:pointer;" @click="createProject">
          Create
        </button>
      </div>
      <div v-if="error" class="muted">{{ error }}</div>
    </div>

    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>ID</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="project in projects" :key="project.id">
            <td>{{ project.name }}</td>
            <td>
              <NuxtLink :to="`/projects/${project.id}`">{{ project.id }}</NuxtLink>
            </td>
            <td>
              <button
                class="card"
                style="padding:6px 10px;cursor:pointer;"
                @click="setCurrentProject(project.id)"
              >
                {{ currentProjectId === project.id ? 'Selected' : 'Use' }}
              </button>
            </td>
          </tr>
          <tr v-if="projects.length === 0">
            <td colspan="3" class="muted">No projects yet.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

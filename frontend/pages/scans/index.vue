<script setup lang="ts">
const { authFetch, isLoggedIn } = useAuth();
const scans = ref<any[]>([]);
const loadError = ref<string | null>(null);

const normalizeArray = (data: any) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data) return [data];
  return [];
};

const loadScans = async () => {
  try {
    if (!isLoggedIn.value) {
      scans.value = [];
      return;
    }
    const data = await authFetch<any[]>('/api/scans');
    scans.value = normalizeArray(data);
    loadError.value = null;
  } catch (err) {
    console.error('Failed to load scans', err);
    loadError.value = err instanceof Error ? err.message : String(err);
    scans.value = [];
  }
};

onMounted(loadScans);
</script>

<template>
  <section>
    <div class="header">
      <div>
        <h1>Scans</h1>
        <p class="muted">All recorded scans and their status.</p>
      </div>
    </div>

    <div class="card">
      <div v-if="loadError" class="muted" style="margin-bottom: 12px;">
        Error loading scans: {{ loadError }}
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Total Files</th>
            <th>Started</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="scan in scans || []" :key="scan.id">
            <td>
              <NuxtLink :to="`/scans/${scan.id}`">{{ scan.id }}</NuxtLink>
            </td>
            <td>{{ scan.status }}</td>
            <td>{{ scan.totalFiles }}</td>
            <td>{{ scan.startedAt || scan.createdAt }}</td>
          </tr>
          <tr v-if="!scans || scans.length === 0">
            <td colspan="4" class="muted">No scans found.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

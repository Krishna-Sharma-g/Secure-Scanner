<script setup lang="ts">
const route = useRoute();
const config = useRuntimeConfig();
const { authFetch, isLoggedIn, ready } = useAuth();
const apiBase = config.public.apiBase || 'http://127.0.0.1:3000';
const scan = ref<any | null>(null);
const progress = ref({ files_processed: 0, total_files: 0, percentage: 0 });
const liveVulns = ref<any[]>([]);

const loadScan = async () => {
  try {
    if (!isLoggedIn.value) {
      scan.value = null;
      return;
    }
    scan.value = await authFetch(`/api/scans/${route.params.id}`);
    liveVulns.value = scan.value?.vulnerabilities || [];
  } catch (err) {
    console.error('Failed to load scan', err);
    scan.value = null;
  }
};

watch([ready, isLoggedIn], ([isReady, logged]) => {
  if (isReady && logged) loadScan();
});
onMounted(async () => {
  const { io } = await import('socket.io-client');
  const socket = io(`${apiBase}/ws`);
  socket.on('scan:progress', (payload: any) => {
    if (payload.scan_id === route.params.id) {
      progress.value = payload;
    }
  });
  socket.on('scan:vulnerability', (payload: any) => {
    if (payload.scan_id === route.params.id) {
      liveVulns.value = [payload.vulnerability, ...liveVulns.value];
    }
  });
  socket.on('scan:complete', (payload: any) => {
    if (payload.scan_id === route.params.id) {
      progress.value = { ...progress.value, percentage: 100 };
    }
  });
});

const vulnCount = computed(() => liveVulns.value.length || (scan.value?.vulnerabilities || []).length);
const progressPercent = computed(() => {
  if (progress.value.percentage) return progress.value.percentage;
  const total = scan.value?.totalFiles || progress.value.total_files || 0;
  if (!total) return 0;
  const processed = progress.value.files_processed || scan.value?.filesProcessed || 0;
  return Math.round((processed / total) * 100);
});
</script>

<template>
  <section>
    <div class="header">
      <div>
        <h1>Scan Detail</h1>
        <p class="muted">{{ scan?.id }}</p>
      </div>
    </div>

    <div class="card">
      <p><strong>Status:</strong> {{ scan?.status }}</p>
      <p><strong>Started:</strong> {{ scan?.startedAt || scan?.createdAt }}</p>
      <p><strong>Total Files:</strong> {{ scan?.totalFiles }}</p>
      <p><strong>Total Vulnerabilities:</strong> {{ vulnCount }}</p>
      <p><strong>Progress:</strong> {{ progressPercent }}%</p>
      <div class="progress">
        <span :style="{ width: progressPercent + '%' }"></span>
      </div>
    </div>

    <div class="card" style="margin-top: 24px;">
      <h3>Vulnerabilities</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Severity</th>
            <th>File</th>
            <th>Line</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="vuln in liveVulns.length ? liveVulns : (scan?.vulnerabilities || [])" :key="vuln.id">
            <td>{{ vuln.type }}</td>
            <td><SeverityBadge :severity="vuln.severity" /></td>
            <td>{{ vuln.filePath }}</td>
            <td>{{ vuln.lineNumber }}</td>
          </tr>
          <tr v-if="!scan || !scan.vulnerabilities || scan.vulnerabilities.length === 0">
            <td colspan="4" class="muted">No vulnerabilities recorded.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

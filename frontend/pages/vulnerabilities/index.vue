<script setup lang="ts">
const { authFetch, isLoggedIn, ready } = useAuth();
const { currentProjectId } = useProject();
const vulns = ref<any[]>([]);

const severityFilter = ref('all');
const statusFilter = ref('all');

const filtered = computed(() => {
  const list = Array.isArray(vulns.value) ? vulns.value : [];
  return list.filter((v) => {
    const severityOk = severityFilter.value === 'all' || v.severity === severityFilter.value;
    const statusOk = statusFilter.value === 'all' || v.status === statusFilter.value;
    return severityOk && statusOk;
  });
});

const loadVulns = () => {
  if (!isLoggedIn.value) {
    vulns.value = [];
    return;
  }
  const url = `/api/vulnerabilities${currentProjectId.value ? `?project_id=${currentProjectId.value}` : ''}`;
  authFetch(url)
    .then((data) => {
      if (Array.isArray(data)) {
        vulns.value = data;
      } else if (data && Array.isArray((data as any).data)) {
        vulns.value = (data as any).data;
      } else if (data) {
        vulns.value = [data];
      } else {
        vulns.value = [];
      }
    })
    .catch((err) => {
      console.error('Failed to load vulnerabilities', err);
      vulns.value = [];
    });
};

onMounted(() => {
  if (ready.value && isLoggedIn.value) loadVulns();
});

watch([ready, isLoggedIn], ([isReady, logged]) => {
  if (isReady && logged) loadVulns();
});

watch(currentProjectId, () => {
  if (ready.value && isLoggedIn.value) loadVulns();
});
</script>

<template>
  <section>
    <div class="header">
      <div>
        <h1>Vulnerabilities</h1>
        <p class="muted">All findings across scans.</p>
      </div>
    </div>

    <div v-if="!currentProjectId" class="card" style="margin-bottom:16px;">
      <p class="muted">No project selected. Go to Projects and select one.</p>
    </div>

    <div class="card">
      <div class="filters">
        <label>
          Severity
          <select v-model="severityFilter">
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>
        </label>
        <label>
          Status
          <select v-model="statusFilter">
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="ignored">Ignored</option>
            <option value="false_positive">False Positive</option>
          </select>
        </label>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Severity</th>
            <th>File</th>
            <th>Line</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="vuln in filtered" :key="vuln.id">
            <td>{{ vuln.type }}</td>
            <td><SeverityBadge :severity="vuln.severity" /></td>
            <td>{{ vuln.filePath }}</td>
            <td>{{ vuln.lineNumber }}</td>
            <td>{{ vuln.status }}</td>
          </tr>
          <tr v-if="filtered.length === 0">
            <td colspan="5" class="muted">No vulnerabilities found.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

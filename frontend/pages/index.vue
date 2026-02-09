<script setup lang="ts">
const { authFetch, isLoggedIn, ready } = useAuth();
const { currentProjectId } = useProject();
const scans = ref<any[]>([]);
const vulns = ref<any[]>([]);

const normalizeArray = (data: any) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data) return [data];
  return [];
};

const loadData = async () => {
  if (!isLoggedIn.value) {
    scans.value = [];
    vulns.value = [];
    return;
  }
  try {
    const scanData = await authFetch<any[]>(`/api/scans${currentProjectId.value ? `?project_id=${currentProjectId.value}` : ''}`);
    scans.value = normalizeArray(scanData);
  } catch (err) {
    console.error('Failed to load scans', err);
    scans.value = [];
  }
  try {
    const vulnData = await authFetch<any[]>(`/api/vulnerabilities${currentProjectId.value ? `?project_id=${currentProjectId.value}` : ''}`);
    vulns.value = normalizeArray(vulnData);
  } catch (err) {
    console.error('Failed to load vulnerabilities', err);
    vulns.value = [];
  }
};

onMounted(() => {
  if (ready.value && isLoggedIn.value) loadData();
});

watch([ready, isLoggedIn], ([isReady, logged]) => {
  if (isReady && logged) loadData();
});

watch(currentProjectId, () => {
  if (ready.value && isLoggedIn.value) loadData();
});

const runTestScan = async () => {
  try {
    await authFetch('/api/scans/test', { method: 'POST', body: { files: 8, vulnerabilities: 3 } });
    await loadData();
  } catch (err) {
    console.error('Failed to run test scan', err);
  }
};

const scanList = computed(() => (Array.isArray(scans.value) ? scans.value : []));
const vulnList = computed(() => (Array.isArray(vulns.value) ? vulns.value : []));

const totalScans = computed(() => scanList.value.length);
const totalVulns = computed(() => vulnList.value.length);
const criticalCount = computed(() => vulnList.value.filter((v) => v.severity === 'critical').length);

const recentScans = computed(() => scanList.value.slice(0, 5));

const severityBuckets = computed(() => {
  const buckets = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const v of vulnList.value) {
    const key = v.severity || 'info';
    if (key in buckets) buckets[key as keyof typeof buckets] += 1;
  }
  return buckets;
});

const totalSev = computed(() =>
  Object.values(severityBuckets.value).reduce((sum, val) => sum + val, 0),
);

const donut = computed(() => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const values = [
    severityBuckets.value.critical,
    severityBuckets.value.high,
    severityBuckets.value.medium,
    severityBuckets.value.low,
    severityBuckets.value.info,
  ];
  let offset = 0;
  return values.map((value) => {
    const ratio = totalSev.value === 0 ? 0 : value / totalSev.value;
    const dash = ratio * circumference;
    const entry = { dash, offset: -offset };
    offset += dash;
    return entry;
  });
});
</script>

<template>
  <section>
    <div class="header">
      <div>
        <h1>Dashboard</h1>
        <p class="muted">Live overview of scans and critical findings.</p>
      </div>
      <button class="card" style="padding: 10px 14px; cursor: pointer;" @click="runTestScan">
        Run Test Scan
      </button>
    </div>

    <div v-if="!currentProjectId" class="card" style="margin-bottom: 16px;">
      <p class="muted">No project selected. Go to Projects and select one.</p>
    </div>

    <div class="card-grid">
      <div class="card">
        <h3>Total Scans</h3>
        <div class="title">{{ totalScans }}</div>
      </div>
      <div class="card">
        <h3>Total Vulnerabilities</h3>
        <div class="title">{{ totalVulns }}</div>
      </div>
      <div class="card">
        <h3>Critical Issues</h3>
        <div class="title">{{ criticalCount }}</div>
      </div>
    </div>

    <div class="card" style="margin-top: 24px;">
      <h3>Recent Scans</h3>
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Started</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="scan in recentScans" :key="scan.id">
            <td>
              <NuxtLink :to="`/scans/${scan.id}`">{{ scan.id }}</NuxtLink>
            </td>
            <td>{{ scan.status }}</td>
            <td>{{ scan.startedAt || scan.createdAt }}</td>
          </tr>
          <tr v-if="recentScans.length === 0">
            <td colspan="3" class="muted">No scans yet.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="chart-grid">
      <div class="card">
        <h3>Severity Distribution</h3>
        <div class="donut">
          <svg width="160" height="160" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#efe8dd" stroke-width="16" />
            <circle
              v-for="(slice, idx) in donut"
              :key="idx"
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke-width="16"
              :stroke="['#3c0505', '#5c2f0c', '#5d4b04', '#0f4732', '#1b2a4f'][idx]"
              :stroke-dasharray="`${slice.dash} ${2 * Math.PI * 50 - slice.dash}`"
              :stroke-dashoffset="slice.offset"
              stroke-linecap="butt"
            />
          </svg>
        </div>
        <div class="legend">
          <span><i style="background:#3c0505;"></i>Critical: {{ severityBuckets.critical }}</span>
          <span><i style="background:#5c2f0c;"></i>High: {{ severityBuckets.high }}</span>
          <span><i style="background:#5d4b04;"></i>Medium: {{ severityBuckets.medium }}</span>
          <span><i style="background:#0f4732;"></i>Low: {{ severityBuckets.low }}</span>
          <span><i style="background:#1b2a4f;"></i>Info: {{ severityBuckets.info }}</span>
        </div>
      </div>
      <div class="card">
        <h3>Scan Volume</h3>
        <p class="muted">Last {{ Math.min(6, scanList.length) }} scans</p>
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Files</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="scan in scanList.slice(0, 6)" :key="scan.id">
              <td>{{ scan.id.slice(0, 8) }}</td>
              <td>{{ scan.status }}</td>
              <td>{{ scan.totalFiles }}</td>
            </tr>
            <tr v-if="scanList.length === 0">
              <td colspan="3" class="muted">No scans yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

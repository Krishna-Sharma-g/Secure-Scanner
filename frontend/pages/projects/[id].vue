<script setup lang="ts">
const route = useRoute();
const { authFetch, isLoggedIn } = useAuth();
const members = ref<any[]>([]);
const email = ref('');
const error = ref<string | null>(null);

const loadMembers = async () => {
  if (!isLoggedIn.value) {
    members.value = [];
    return;
  }
  try {
    members.value = await authFetch<any[]>(`/api/projects/${route.params.id}/members`);
    error.value = null;
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  }
};

const invite = async () => {
  if (!email.value.trim()) return;
  try {
    await authFetch(`/api/projects/${route.params.id}/members`, {
      method: 'POST',
      body: { email: email.value.trim(), role: 'member' },
    });
    email.value = '';
    await loadMembers();
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  }
};

onMounted(loadMembers);
</script>

<template>
  <section>
    <div class="header">
      <div>
        <h1>Project Members</h1>
        <p class="muted">Invite teammates to view scans.</p>
      </div>
    </div>

    <div class="card" style="margin-bottom: 16px;">
      <div class="filters">
        <label>
          Member email
          <input v-model="email" placeholder="teammate@example.com" style="padding:8px 10px;border-radius:10px;border:1px solid var(--border);" />
        </label>
        <button class="card" style="padding:10px 14px;cursor:pointer;" @click="invite">
          Invite
        </button>
      </div>
      <div v-if="error" class="muted">{{ error }}</div>
    </div>

    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in members" :key="member.id">
            <td>{{ member.user?.name || '—' }}</td>
            <td>{{ member.user?.email }}</td>
            <td>{{ member.role }}</td>
          </tr>
          <tr v-if="members.length === 0">
            <td colspan="3" class="muted">No members yet.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

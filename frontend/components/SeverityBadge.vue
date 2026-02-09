<template>
  <span class="badge" :class="severityClass">{{ label }}</span>
</template>

<script setup lang="ts">
const props = defineProps<{ severity: string }>();

const severityClass = computed(() => props.severity?.toLowerCase() || 'info');
const label = computed(() => (props.severity || 'info').toUpperCase());
</script>

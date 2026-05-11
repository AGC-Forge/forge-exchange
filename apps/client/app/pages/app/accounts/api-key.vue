<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "API Key",
  description: "Manage your account API key.",
  robots: "noindex, nofollow",
});
</script>

<template>
  <AppAccountLayout>
    <UPageCard
      title="API Key"
      description="Update your API key."
      variant="naked"
      class="mb-4"
    >
      <UPageCard
        variant="subtle"
        :ui="{ container: 'divide-y divide-default' }"
      >
      </UPageCard>
    </UPageCard>
  </AppAccountLayout>
</template>

<style scoped></style>

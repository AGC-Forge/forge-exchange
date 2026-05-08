<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Security",
  description: "Manage your account security.",
  robots: "noindex, nofollow",
});
</script>

<template>
  <AppAccountLayout>
    <UPageCard
      title="Security"
      description="Update your security."
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

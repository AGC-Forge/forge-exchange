<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Profile",
  description: "Manage your account profile.",
  robots: "noindex, nofollow",
});
</script>

<template>
  <AppAccountLayout>
    <UPageCard
      title="Profile"
      description="Update your profile."
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

<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Settings",
  description: "Manage your account settings.",
  robots: "noindex, nofollow",
});
</script>

<template>
  <AppSettingLayout>
    <UPageCard
      title="General Settings"
      description="Update your general settings."
      variant="naked"
      class="mb-4"
    >
      <UPageCard
        variant="subtle"
        :ui="{ container: 'divide-y divide-default' }"
      >
      </UPageCard>
    </UPageCard>
  </AppSettingLayout>
</template>

<style scoped></style>

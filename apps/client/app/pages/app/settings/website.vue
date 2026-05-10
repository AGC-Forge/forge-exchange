<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Website Settings",
  description: "Manage your website settings.",
  robots: "noindex, nofollow",
});
</script>

<template>
  <AppSettingLayout>
    <UPageCard
      title="Website Settings"
      description="Update your website settings."
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

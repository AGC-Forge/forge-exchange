<script lang="ts" setup>
definePageMeta({
  layout: "auth",
  middleware: "admin",
});
useSeoMeta({
  title: "Transactions",
  description: "Manage your transactions.",
  robots: "noindex, nofollow",
});
</script>

<template>
  <AppDashboardLayout id="transactions" title="Transactions">
    <template #content>
      <div class="min-h-screen p-6">
        <div class="mx-auto max-w-7xl space-y-6"></div>
      </div>
    </template>
  </AppDashboardLayout>
</template>

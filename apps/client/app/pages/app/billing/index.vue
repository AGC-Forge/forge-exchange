<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Workers",
  description: "Manage your workers.",
  robots: "noindex, nofollow",
});
</script>

<template>
  <AppDashboardLayout id="billing" title="Billing">
    <div class="m-auto w-full max-w-350 p-0 md:p-2"></div>
  </AppDashboardLayout>
</template>

<style scoped></style>

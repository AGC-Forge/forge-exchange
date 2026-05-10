<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Create Integration",
  description: "Create a new integration to connect with external services.",
  robots: "noindex, nofollow",
});
</script>

<template>
  <AppDashboardLayout id="create-integration" title="Create Integration">
    <div class="m-auto w-full max-w-350 p-0 md:p-2"></div>
  </AppDashboardLayout>
</template>

<style scoped></style>

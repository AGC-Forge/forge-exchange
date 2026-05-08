<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Edit Integration",
  description:
    "Edit your integration details to connect with external services.",
  robots: "noindex, nofollow",
});
</script>

<template>
  <AppDashboardLayout id="edit-integration" title="Edit Integration">
    <div class="m-auto w-full max-w-350 p-0 md:p-2"></div>
  </AppDashboardLayout>
</template>

<style scoped></style>

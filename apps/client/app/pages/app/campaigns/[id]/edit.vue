<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Edit Campaign",
  description: "Edit your campaign details to reach your audience.",
  robots: "noindex, nofollow",
});
</script>

<template>
  <AppDashboardLayout id="edit-campaign" title="Edit Campaign">
    <div class="m-auto w-full max-w-350 p-0 md:p-2"></div>
  </AppDashboardLayout>
</template>

<style scoped></style>

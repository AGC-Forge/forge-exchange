<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Campaigns",
  description:
    "Welcome to your campaigns page. Here you can manage your campaigns.",
  robots: "noindex, nofollow",
});
</script>

<template>
  <AppDashboardLayout id="campaigns" title="Campaigns">
    <div class="m-auto w-full max-w-350 p-0 md:p-2"></div>
  </AppDashboardLayout>
</template>

<style scoped></style>

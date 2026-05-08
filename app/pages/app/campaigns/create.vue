<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Create Campaigns",
  description:
    "Create a new campaign to start driving traffic to your website.",
  robots: "noindex, nofollow",
});
</script>

<template>
  <AppDashboardLayout id="create-campaign" title="Create Campaign">
    <div class="m-auto w-full max-w-350 p-0 md:p-2"></div>
  </AppDashboardLayout>
</template>

<style scoped></style>

<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Users",
  description: "Welcome to your users page. Here you can manage your users.",
  robots: "noindex, nofollow",
});
</script>

<template>
  <AppDashboardLayout id="users" title="Users">
    <div class="m-auto w-full max-w-350 p-0 md:p-2"></div>
  </AppDashboardLayout>
</template>

<style scoped></style>

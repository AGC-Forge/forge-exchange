<script setup lang="ts">
import { sub } from "date-fns";
import { Chart, registerables } from "chart.js";

definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Dashboard",
  description:
    "Welcome to your dashboard. Here you can manage your account and view your activity.",
  robots: "noindex, nofollow",
});
</script>

<template>
  <AppDashboardLayout id="dashboard" title="Dashboard">
    <div class="m-auto w-full max-w-350 p-0 md:p-2"></div>
  </AppDashboardLayout>
</template>

<style scoped></style>

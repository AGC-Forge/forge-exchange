<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
  validate: (params) => {
    //@ts-expect-error id is a string
    return /^[a-zA-Z0-9-]+$/.test(params.id);
  },
});
useSeoMeta({
  title: "Edit Campaign",
  description: "Edit your campaign details to reach your audience.",
  robots: "noindex, nofollow",
});

const route = useRoute();
const router = useRouter();
const id = route.params.id as string;
</script>

<template>
  <AppDashboardLayout id="edit-campaign" title="Edit Campaign">
    <div class="m-auto w-full max-w-350 p-0 md:p-2"></div>
  </AppDashboardLayout>
</template>

<style scoped></style>

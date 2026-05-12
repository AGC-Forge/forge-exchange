<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "API Key",
  description: "Manage your account API key.",
  robots: "noindex, nofollow",
});

const openSuccessWhiteListModal = ref(false);

const handleJoinWhiteList = () => {
  openSuccessWhiteListModal.value = true;
};
</script>

<template>
  <AppAccountLayout>
    <UPageCard
      title="API Key"
      description="Update your API key."
      variant="naked"
      class="mb-4"
    >
      <UPageCard
        variant="subtle"
        :ui="{ container: 'divide-y divide-default' }"
      >
        <UPageSection
          title="Coming Soon"
          description="API key management is coming soon."
          icon="i-lucide-rocket"
        >
          <template #body>
            <form
              class="flex flex-col items-center justify-center gap-4"
              @submit.prevent="handleJoinWhiteList"
            >
              <h1 class="text-2xl font-bold">
                Join White List to Get Access to Our API
              </h1>
              <UInput
                name="email"
                placeholder="Enter your email"
                variant="outline"
                icon="material-symbols:mail"
                autocomplete="email"
                class="bg-white dark:bg-black w-full"
              />
              <UButton
                size="md"
                color="primary"
                icon="i-heroicons-arrow-right"
                class="text-white"
              >
                Join White List
              </UButton>
            </form>
          </template>
        </UPageSection>
      </UPageCard>
    </UPageCard>
  </AppAccountLayout>
</template>

<style scoped></style>

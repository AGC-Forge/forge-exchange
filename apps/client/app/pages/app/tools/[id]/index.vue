<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
  validate: (params) => /^[a-zA-Z0-9-]+$/.test((params as any).id),
});
const route = useRoute();
const router = useRouter();
const toast = useToast();
const tool = computed(() =>
  CHECKER_TOOLS_CATALOG.find((tool) => tool.id === (route.params.id as string)),
);

if (!tool.value) {
  toast.add({
    title: "Error",
    description: "Tool not found",
    color: "error",
    duration: 3000,
    icon: "material-symbols:x-circle-outline",
  });
  router.push("/app/tools");
}

useSeoMeta({
  title: tool.value?.name || "Tools",
  description: tool.value?.description || "Tools to help you with your tasks.",
  robots: "noindex, nofollow",
});
</script>

<template>
  <AppDashboardLayout id="tool" :title="tool?.name || 'Tools'">
    <template #content>
      <div class="min-h-screen p-6">
        <div class="mx-auto max-w-7xl space-y-8">
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-2xl font-bold tracking-tight">
                {{ tool?.name || "Tools" }}
              </h1>
              <p class="text-sm text-muted mt-0.5">
                {{ tool?.description || "Tools to help you with your tasks." }}
              </p>
            </div>
            <UBadge
              :color="tool?.status === 'active' ? 'primary' : 'warning'"
              variant="soft"
            >
              {{ tool?.status === "active" ? "Active" : "Inactive" }}
            </UBadge>
          </div>
          <section class="space-y-4">
            <AppToolsBulkProxyChecker v-if="tool?.id === 'proxy-checker'" />
            <AppToolsBulkAntidetectChecker
              v-else-if="tool?.id === 'antidetect-checker'"
            />
            <UEmpty
              v-else
              icon="i-lucide-file"
              title="Tool not found"
              description="It looks like you haven't added any tools. Create one to get started."
              :actions="[
                {
                  icon: 'i-lucide-arrow-right',
                  label: 'Go back to tools list',
                  to: '/app/tools',
                  variant: 'solid',
                  color: 'primary',
                  class: 'text-white',
                  size: 'md',
                },
              ]"
            />
          </section>
        </div>
      </div>
    </template>
  </AppDashboardLayout>
</template>

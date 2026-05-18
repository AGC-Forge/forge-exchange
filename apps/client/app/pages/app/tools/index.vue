<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Tools",
  description: "Tools to help you with your tasks.",
  robots: "noindex, nofollow",
});
</script>

<template>
  <AppDashboardLayout id="tools" title="Tools">
    <template #content>
      <div class="min-h-screen p-6">
        <div class="mx-auto max-w-7xl space-y-8">
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-2xl font-bold tracking-tight">Tools</h1>
              <p class="text-sm text-muted mt-0.5">
                Tools to help you with your tasks.
              </p>
            </div>
            <UBadge color="primary" variant="soft">
              {{
                CHECKER_TOOLS_CATALOG.filter((tool) => tool.status === "active")
                  .length
              }}
              Active
            </UBadge>
          </div>
          <section class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div
                v-for="tool in CHECKER_TOOLS_CATALOG"
                :key="tool.id"
                class="relative border rounded-xl px-5 py-8 transition-all"
                :class="['border-primary/30 bg-primary/5 shadow-sm']"
              >
                <!-- Connected indicator -->
                <div class="absolute top-3 right-3 flex items-center gap-1.5">
                  <span
                    :class="
                      cn(
                        'w-2 h-2 rounded-full animate-pulse',
                        tool.status === 'inactive'
                          ? 'bg-yellow-400'
                          : 'bg-green-400',
                      )
                    "
                  />
                  <span
                    :class="
                      cn(
                        'text-xs text-green-400 font-medium',
                        tool.status === 'inactive'
                          ? 'text-yellow-400'
                          : 'text-green-400',
                      )
                    "
                  >
                    {{ tool.status === "active" ? "Active" : "Coming Soon" }}
                  </span>
                </div>

                <!-- Provider info -->
                <div class="flex items-start gap-3 mb-3">
                  <div
                    class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    :class="`bg-${tool.color}-500/15`"
                  >
                    <UIcon
                      :name="tool.icon"
                      class="w-5 h-5"
                      :class="`text-${tool.color}-400`"
                    />
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-semibold text-sm">{{ tool.name }}</span>
                    </div>
                    <p class="text-xs text-muted mt-0.5 line-clamp-2">
                      {{ tool.description }}
                    </p>
                  </div>
                </div>

                <!-- Not connected -->
                <div class="flex items-center gap-2 mt-3">
                  <UButton
                    :to="`/app/tools/${tool.id}`"
                    size="xs"
                    color="primary"
                    icon="i-heroicons-arrow-right"
                    class="text-white"
                  >
                    Start
                  </UButton>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>
  </AppDashboardLayout>
</template>

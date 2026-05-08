<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
const links = [
  [
    {
      label: "Profile",
      icon: "i-lucide-user",
      to: "/app/accounts",
      exact: true,
    },
    {
      label: "Security",
      icon: "mdi:shield",
      to: "/app/accounts/security",
      exact: true,
    },
  ],
] satisfies NavigationMenuItem[][];
</script>
<template>
  <div class="flex h-screen w-full flex-col">
    <UDashboardPanel
      id="settings"
      :ui="{
        body: 'lg:py-12 flex-1',
        root: 'h-full flex flex-col',
      }"
      class="flex-1"
    >
      <template #header>
        <UDashboardNavbar title="Settings">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
          <template #right>
            <ColorModeButton />
          </template>
        </UDashboardNavbar>

        <UDashboardToolbar>
          <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
        </UDashboardToolbar>
      </template>

      <template #body>
        <div class="mx-auto h-full w-full flex-1 overflow-hidden">
          <div class="h-full overflow-y-auto px-4 sm:px-6 lg:px-8">
            <div class="mx-auto max-w-4xl py-4 sm:py-6 lg:py-8">
              <slot />
            </div>
          </div>
        </div>
      </template>
    </UDashboardPanel>
  </div>
</template>
<style scoped></style>

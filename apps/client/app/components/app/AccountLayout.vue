<script setup lang="ts">
import type { NavigationMenuItem, DropdownMenuItem } from "@nuxt/ui";

const { user, clear } = useUserSession();
const { wsConnected } = useRealtimeStore();

const creditBalance = computed(
  () => user.value?.subscription?.creditBalance ?? 0,
);

const planLabel = computed(() => {
  const plan = user.value?.subscription?.plan ?? "free";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
});

const userMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: user.value?.name ?? "User",
      avatar: {
        src: user.value?.avatarUrl ?? "/images/no-avatar.jpg",
        alt: user.value?.name ?? "User",
        size: "xs",
        color: "primary",
        loading: "lazy",
        ui: {
          root: "bg-indigo-600 dark:bg-indigo-500",
          fallback: "text-white",
        },
      },
      type: "label",
      slot: "badge" as const,
    },
  ],
  [
    {
      label: "Profile",
      icon: "i-heroicons-user",
      to: "/app/accounts",
    },
    {
      label: "Security",
      to: "/app/accounts/security",
      icon: "material-symbols:security",
    },
    {
      label: "API Key",
      to: "/app/accounts/api-key",
      icon: "i-lucide-key",
    },
  ],
  [
    {
      label: "Logout",
      icon: "i-heroicons-arrow-right-on-rectangle",
      color: "error" as const,
      onSelect: async () => {
        await clear();
        await navigateTo("/login");
      },
    },
  ],
]);
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
    {
      label: "API Key",
      icon: "i-lucide-key",
      to: "/app/accounts/api-key",
      exact: true,
    },
  ],
] satisfies NavigationMenuItem[][];
</script>
<template>
  <div class="flex h-screen w-full flex-col">
    <UDashboardPanel
      id=""
      :ui="{
        body: 'lg:py-12 flex-1',
        root: 'h-full flex flex-col',
      }"
      class="flex-1"
    >
      <template #header>
        <UDashboardNavbar title="Account">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
          <template #right>
            <div
              class="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted border border-muted rounded-lg"
            >
              <UIcon
                name="i-heroicons-bolt"
                class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400"
              />
              <span
                class="text-xs font-medium text-neutral-800 dark:text-neutral-200"
              >
                {{ creditBalance.toLocaleString() }}
              </span>
              <span class="text-xs text-neutral-500 dark:text-neutral-400"
                >credits</span
              >
            </div>
            <div
              :class="
                cn(
                  'flex items-center gap-1.5 border  py-1.5 px-2.5 rounded-md',
                  wsConnected
                    ? 'border-primary'
                    : 'border-neutral-400 dark:border-neutral-500',
                )
              "
            >
              <span
                class="w-2 h-2 rounded-full transition-all duration-300 animate-pulse"
                :class="
                  wsConnected
                    ? 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_6px_#10b981]'
                    : 'bg-neutral-500 dark:bg-neutral-400'
                "
              />
              <span
                :class="
                  cn(
                    'text-xs hidden sm:block',
                    wsConnected
                      ? 'text-primary'
                      : 'text-neutral-500 dark:text-neutral-400',
                  )
                "
              >
                {{ wsConnected ? "Live" : "Offline" }}
              </span>
            </div>
            <ColorModeButton />
            <UButton
              icon="material-symbols:notifications"
              color="neutral"
              variant="ghost"
              size="md"
              shadow
              class="text-warning"
            />
            <UDropdownMenu :items="userMenuItems">
              <button
                class="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all text-left cursor-pointer"
              >
                <UAvatar
                  :alt="user?.name ?? user?.email ?? 'U'"
                  color="primary"
                  size="xs"
                  :ui="{
                    root: 'bg-indigo-600 dark:bg-indigo-500',
                    fallback: 'text-white',
                  }"
                />
              </button>
              <template #badge-trailing>
                <UBadge
                  type="primary"
                  size="xs"
                  :label="planLabel"
                  class="text-white font-semibold"
                />
              </template>
            </UDropdownMenu>
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

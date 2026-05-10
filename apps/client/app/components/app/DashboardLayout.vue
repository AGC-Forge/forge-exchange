<script setup lang="ts">
import type { ClassNameValue } from "tailwind-merge";
import type { HTMLAttributes } from "vue";

const props = withDefaults(
  defineProps<{
    id?: string;
    title?: string;
    root?: ClassNameValue;
    body?: ClassNameValue;
    handle?: ClassNameValue;
    class?: HTMLAttributes["class"];
  }>(),
  {
    id: "dashboard",
    title: "Dashboard",
  },
);

const { user, clear } = useUserSession();
const route = useRouter().currentRoute;
const { wsConnected } = useRealtimeStore();

const classValue = computed(() => cn(props.class));

const creditBalance = computed(
  () => user.value?.subscription?.creditBalance ?? 0,
);

const planLabel = computed(() => {
  const plan = user.value?.subscription?.plan ?? "free";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
});

const userMenuItems = computed(() => [
  [
    {
      label: "Profile",
      icon: "i-heroicons-user",
      to: "/app/accounts",
    },
    {
      label: "API Keys",
      icon: "i-heroicons-key",
      to: "/app/accounts/security",
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
</script>
<template>
  <div class="flex h-screen w-full flex-col">
    <UDashboardPanel
      :id="id"
      :ui="{
        root: root,
        body: body,
        handle: handle,
      }"
      :class="classValue"
    >
      <template #header>
        <UDashboardNavbar :title="title">
          <template #leading>
            <UDashboardSidebarCollapse size="md" />
            <slot name="leading"></slot>
          </template>

          <template #right="{ sidebarOpen }">
            <!-- <CustomersAddModal /> -->
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
            <ColorModeButton />
            <UButton
              icon="material-symbols:notifications"
              color="neutral"
              variant="ghost"
              size="sm"
              class="text-indigo-600 dark:text-indigo-500"
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
                <div
                  class="overflow-hidden transition-all duration-300 min-w-0 hidden lg:block"
                  :class="sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'"
                >
                  <p class="text-xs font-medium truncate">
                    {{ user?.name ?? "User" }}
                  </p>
                  <p class="text-xs text-muted truncate">{{ planLabel }}</p>
                </div>
              </button>
            </UDropdownMenu>
            <slot name="right"></slot>
          </template>
          <slot name="toolbar"></slot>
        </UDashboardNavbar>
      </template>
      <template #body>
        <div class="mx-auto h-full w-full flex-1 overflow-hidden">
          <div class="h-full overflow-y-auto px-2">
            <div class="mx-auto w-full space-x-3">
              <slot name="content"></slot>
            </div>
          </div>
        </div>
      </template>
    </UDashboardPanel>
  </div>
</template>

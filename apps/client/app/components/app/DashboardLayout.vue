<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
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
const { wsConnected } = useRealtimeStore();

const isWsConnected = ref(wsConnected.value);

watch(
  () => wsConnected,
  (connected) => {
    if (connected) {
      isWsConnected.value = true;
    } else {
      isWsConnected.value = false;
    }
  },
  { immediate: true },
);

const classValue = computed(() => cn(props.class));

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
            <div
              :class="
                cn(
                  'flex items-center gap-1.5 border  py-1.5 px-2.5 rounded-md',
                  isWsConnected
                    ? 'border-primary'
                    : 'border-neutral-400 dark:border-neutral-500',
                )
              "
            >
              <span
                class="w-2 h-2 rounded-full transition-all duration-300 animate-pulse"
                :class="
                  isWsConnected
                    ? 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_6px_#10b981]'
                    : 'bg-neutral-500 dark:bg-neutral-400'
                "
              />
              <span
                :class="
                  cn(
                    'text-xs hidden sm:block',
                    isWsConnected
                      ? 'text-primary'
                      : 'text-neutral-500 dark:text-neutral-400',
                  )
                "
              >
                {{ isWsConnected ? "Live" : "Offline" }}
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

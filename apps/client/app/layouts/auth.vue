<script setup lang="ts">
const { session } = useUserSession();
const route = useRoute();
const open = ref(false);

const isAdmin = computed(() =>
  [0, 1].includes(session.value?.user?.role.level || 0),
);

const links = [
  [
    {
      label: "Home",
      to: "/app",
      icon: "i-lucide-house",
      requireAdmin: false,
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Analytics",
      icon: "i-lucide-chart-bar",
      to: "/app/analytics",
      requireAdmin: false,
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Campaigns",
      to: "/app/campaigns",
      icon: "material-symbols:campaign-rounded",
      requireAdmin: false,
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Integrations",
      to: "/app/integrations",
      icon: "icon-park-outline:connection-point",
      requireAdmin: false,
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Workers",
      icon: "i-lucide-server",
      to: "/app/workers",
      requireAdmin: true,
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Proxies",
      icon: "material-symbols-light:vpn-lock-rounded",
      to: "/app/proxies",
      requireAdmin: false,
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Billing",
      icon: "streamline:money-cash-coins-stack-accounting-billing-payment-stack-cash-coins-currency-money-finance",
      to: "/app/billing",
      requireAdmin: false,
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Settings",
      to: "/app/settings",
      icon: "i-lucide-settings",
      defaultOpen: false,
      type: "trigger",
      requireAdmin: true,
      children: [
        {
          label: "General",
          to: "/app/settings",
          icon: "i-lucide-sliders-horizontal",
          exact: true,
          onSelect: () => {
            open.value = false;
          },
        },
        {
          label: "Website",
          to: "/app/settings/website",
          icon: "mdi:web",
          exact: true,
          onSelect: () => {
            open.value = false;
          },
        },
      ],
    },

    {
      label: "Accounts",
      to: "#",
      icon: "i-lucide-settings",
      defaultOpen: false,
      type: "trigger",
      requireAdmin: false,
      children: [
        {
          label: "Profile",
          icon: "i-lucide-user",
          to: "/app/accounts",
          exact: true,
          onSelect: () => {
            open.value = false;
          },
        },
        {
          label: "Security",
          to: "/app/accounts/security",
          icon: "i-lucide-shield",
          exact: true,
          onSelect: () => {
            open.value = false;
          },
        },
        {
          label: "API Key",
          icon: "i-lucide-key",
          to: "/app/accounts/api-key",
          exact: true,
          onSelect: () => {
            open.value = false;
          },
        },
      ],
    },
  ],
  [
    {
      label: "Home Page",
      icon: "i-lucide-home",
      to: "/",
      target: "_blank",
      requireAdmin: false,
    },
  ],
] satisfies AppNavigationMenuItem[][];

const userMenu = computed(() => {
  const menus = links[0] as AppNavigationMenuItem[];
  return menus.filter((item) => !item.requireAdmin) || [];
});
const adminMenu = computed(() => {
  const menus = links[0] as AppNavigationMenuItem[];
  return menus;
});
const groups = computed(() => [
  {
    id: "links",
    label: "Go to",
    items: links.flat(),
  },
  {
    id: "code",
    label: "Code",
    items: [
      {
        id: "source",
        label: "View page source",
        icon: "i-simple-icons-github",
        to: `https://github.com/nuxt-ui-templates/dashboard/blob/main/app/pages${route.path === "/" ? "/index" : route.path}.vue`,
        target: "_blank",
      },
    ],
  },
]);
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <AppLogo :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton
          :collapsed="collapsed"
          size="md"
          class="ring-default bg-white dark:bg-neutral-950"
        />

        <UNavigationMenu
          v-if="isAdmin"
          :collapsed="collapsed"
          :items="adminMenu"
          orientation="vertical"
          tooltip
          popover
          class="space-y-5"
          :ui="{
            list: 'space-y-2',
            link: 'group relative w-full flex items-center text-neutral-800 dark:text-neutral-100 hover:text-primary active:text-primary focus:text-primary focus-visible:before:ring-primary dark:focus-visible:before:ring-primary',
            linkLeadingIcon:
              'text-neutral-800 dark:text-neutral-100 group-hover:text-primary active:text-primary focus:text-primary focus-visible:before:ring-primary dark:focus-visible:before:ring-primary',
          }"
        />
        <UNavigationMenu
          v-else
          :collapsed="collapsed"
          :items="userMenu"
          orientation="vertical"
          tooltip
          popover
          class="space-y-5"
          :ui="{
            list: 'space-y-2',
            link: 'group relative w-full flex items-center text-neutral-800 dark:text-neutral-100 hover:text-primary active:text-primary focus:text-primary focus-visible:before:ring-primary dark:focus-visible:before:ring-primary',
            linkLeadingIcon:
              'text-neutral-800 dark:text-neutral-100 group-hover:text-primary active:text-primary focus:text-primary focus-visible:before:ring-primary dark:focus-visible:before:ring-primary',
          }"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto space-y-5"
        />
      </template>

      <template #footer="{ collapsed }">
        <AppUserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>
    <UDashboardSearch :groups="groups" />
    <NuxtPage />
    <PageLoader />
  </UDashboardGroup>
</template>

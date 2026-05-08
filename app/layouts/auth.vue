<script setup lang="ts">
const route = useRoute();

const open = ref(false);

const links = [
  [
    {
      label: "Home",
      to: "/app",
      icon: "i-lucide-house",
      role: ["admin", "moderator", "user"],
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Campaigns",
      to: "/app/campaigns",
      icon: "material-symbols:campaign-rounded",
      role: ["admin", "moderator", "user"],
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Integrations",
      to: "/app/integrations",
      icon: "icon-park-outline:connection-point",
      role: ["admin", "moderator", "user"],
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Users",
      icon: "i-lucide-users",
      to: "/app/users",
      role: ["admin", "moderator"],
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
      role: ["admin", "moderator"],
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
      role: ["admin", "moderator"],
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
      ],
    },
  ],
  [
    {
      label: "Home Page",
      icon: "i-lucide-home",
      to: "/",
      target: "_blank",
    },
  ],
] satisfies AppNavigationMenuItem[][];

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
          class="ring-default bg-transparent"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
          class="space-y-5"
          :ui="{ list: 'space-y-2' }"
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

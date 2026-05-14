<script setup lang="ts">
interface DocsSection {
  title: string;
  subtitle: string;
  sidebar: Record<string, string>;
  sections: {
    [key: string]: Record<string, any>;
  };
}
definePageMeta({ layout: "default" });

const { t, locale, messages } = useI18n();
const localePath = useLocalePath();
const route = useRoute();

useSeoMeta({
  title: "Documentation — Forge Exchange",
  description:
    "Complete documentation for integrating and managing Forge Exchange.",
});

const localeMessages = computed(() => messages.value as Record<string, any>);
const finalDocs = computed(() => {
  return (localeMessages.value?.[locale.value as string]?.docs as any) || {};
});
// Active section from query
const activeSection = ref("getting-started");

const sections = [
  { id: "getting-started", label: "Getting Started", icon: "i-lucide-rocket" },
  { id: "authentication", label: "Authentication", icon: "i-lucide-key" },
  { id: "campaigns", label: "Campaigns", icon: "i-lucide-megaphone" },
  { id: "workers", label: "Workers", icon: "i-lucide-server" },
  { id: "analytics", label: "Analytics", icon: "i-lucide-chart-bar" },
  { id: "integrations", label: "Integrations", icon: "i-lucide-plug" },
  { id: "webhooks", label: "Webhooks", icon: "i-lucide-webhook" },
  { id: "api-reference", label: "API Reference", icon: "i-lucide-code-2" },
];

const docContent = computed<any>(() => ({
  "getting-started": {
    title: t("docs.sections.gettingStarted.title"),
    content: [
      {
        type: "callout",
        variant: "info",
        text: t("docs.sections.gettingStarted.overview.description"),
      },
      {
        type: "h3",
        text: t("docs.sections.gettingStarted.quickStart.title"),
      },
      {
        type: "list",
        items:
          localeMessages.value?.docs?.sections?.gettingStarted?.quickStart
            ?.steps || [],
      },
      {
        type: "callout",
        variant: "default",
        title: t("docs.sections.gettingStarted.baseUrl.title"),
        text: `${t("docs.sections.gettingStarted.baseUrl.description")} \`https://api.forge-exchange.app/v1\``,
      },
    ],
  },
  authentication: {
    title: t("docs.sections.authentication.title"),
    content: [
      {
        type: "callout",
        variant: "warning",
        text: "Never share your API keys publicly. Keep them secure on your server.",
      },
      {
        type: "h3",
        text: t("docs.sections.authentication.apiKey.title"),
      },
      {
        type: "p",
        text: t("docs.sections.authentication.apiKey.description"),
      },
      {
        type: "code",
        language: "bash",
        code: "Authorization: Bearer YOUR_API_KEY",
      },
      {
        type: "h3",
        text: t("docs.sections.authentication.generation.title"),
      },
      {
        type: "p",
        text: t("docs.sections.authentication.generation.description"),
      },
    ],
  },
  campaigns: {
    title: t("docs.sections.campaigns.title"),
    content: [
      {
        type: "p",
        text: t("docs.sections.campaigns.description"),
      },
      {
        type: "h3",
        text: t("docs.sections.campaigns.create.title"),
      },
      {
        type: "p",
        text: t("docs.sections.campaigns.create.description"),
      },
      {
        type: "code",
        language: "bash",
        code: `POST /campaigns

{
  "name": "My Campaign",
  "url": "https://example.com",
  "targeting": {
    "countries": ["US", "GB"],
    "devices": ["desktop", "mobile"]
  }
}`,
      },
      {
        type: "h3",
        text: t("docs.sections.campaigns.list.title"),
      },
      {
        type: "p",
        text: t("docs.sections.campaigns.list.description"),
      },
      {
        type: "code",
        language: "bash",
        code: "GET /campaigns",
      },
      {
        type: "callout",
        variant: "info",
        text: t("docs.sections.campaigns.status.description"),
      },
    ],
  },
  workers: {
    title: t("docs.sections.workers.title"),
    content: [
      {
        type: "p",
        text: t("docs.sections.workers.description"),
      },
      {
        type: "h3",
        text: t("docs.sections.workers.setup.title"),
      },
      {
        type: "p",
        text: t("docs.sections.workers.setup.description"),
      },
      {
        type: "code",
        language: "bash",
        code: "npm install @forge-exchange/worker",
      },
      {
        type: "code",
        language: "bash",
        code: "forge-worker start --api-key YOUR_API_KEY",
      },
      {
        type: "h3",
        text: t("docs.sections.workers.config.title"),
      },
      {
        type: "p",
        text: t("docs.sections.workers.config.description"),
      },
    ],
  },
  analytics: {
    title: t("docs.sections.analytics.title"),
    content: [
      {
        type: "p",
        text: t("docs.sections.analytics.description"),
      },
      {
        type: "h3",
        text: t("docs.sections.analytics.metrics.title"),
      },
      {
        type: "p",
        text: t("docs.sections.analytics.metrics.description"),
      },
      {
        type: "list",
        items:
          localeMessages.value?.docs?.sections?.analytics?.metrics?.list || [],
      },
    ],
  },
  webhooks: {
    title: t("docs.sections.webhooks.title"),
    content: [
      {
        type: "p",
        text: t("docs.sections.webhooks.description"),
      },
      {
        type: "h3",
        text: t("docs.sections.webhooks.setup.title"),
      },
      {
        type: "p",
        text: t("docs.sections.webhooks.setup.description"),
      },
      {
        type: "code",
        language: "bash",
        code: `POST /integrations

{
  "type": "webhook",
  "url": "https://your-server.com/webhook",
  "events": ["campaign.started", "campaign.completed"]
}`,
      },
      {
        type: "h3",
        text: t("docs.sections.webhooks.events.title"),
      },
      {
        type: "p",
        text: t("docs.sections.webhooks.events.description"),
      },
    ],
  },
  "api-reference": {
    title: t("docs.sections.apiReference.title"),
    content: [
      {
        type: "p",
        text: t("docs.sections.apiReference.description"),
      },
      {
        type: "p",
        text: t("docs.sections.apiReference.endpoints"),
      },
      {
        type: "callout",
        variant: "info",
        text: t("docs.sections.apiReference.rateLimits"),
      },
    ],
  },
  integrations: {
    title: t("docs.sections.integrations.title"),
    content: [
      {
        type: "callout",
        variant: "info",
        text: t("docs.sections.integrations.description"),
      },
      {
        type: "h3",
        text: t("docs.sections.integrations.slack.title"),
      },
      {
        type: "p",
        text: t("docs.sections.integrations.slack.description"),
      },
      {
        type: "code",
        language: "bash",
        code: `POST /integrations

{
  "type": "slack",
  "webhook_url": "https://hooks.slack.com/services/..."
}`,
      },
      {
        type: "h3",
        text: t("docs.sections.integrations.discord.title"),
      },
      {
        type: "p",
        text: t("docs.sections.integrations.discord.description"),
      },
      {
        type: "code",
        language: "bash",
        code: `POST /integrations

{
  "type": "discord",
  "webhook_url": "https://discord.com/api/webhooks/..."
}`,
      },
    ],
  },
}));

// Mobile sidebar
const isSidebarOpen = ref(false);
</script>

<template>
  <div>
    <!-- Page Header -->
    <section
      class="bg-white dark:bg-neutral-950 border-b border-neutral-200/50 dark:border-neutral-800/50"
    >
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <h1
          class="font-aeonik-pro-trial text-4xl sm:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight mb-3"
        >
          {{ t("docs.title") }}
        </h1>
        <p class="text-lg text-neutral-500 dark:text-neutral-400 max-w-2xl">
          {{ t("docs.subtitle") }}
        </p>
      </div>
    </section>

    <!-- Docs Layout -->
    <section class="py-10 lg:py-14 bg-neutral-50 dark:bg-neutral-900/50">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex gap-10 relative">
          <!-- Mobile Sidebar Toggle -->
          <button
            class="lg:hidden fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500 text-white shadow-lg shadow-green-500/30 font-medium text-sm"
            @click="isSidebarOpen = !isSidebarOpen"
          >
            <UIcon name="i-lucide-menu" class="h-4 w-4" />
            Menu
          </button>

          <!-- Mobile Sidebar Overlay -->
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div
              v-if="isSidebarOpen"
              class="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              @click="isSidebarOpen = false"
            />
          </Transition>

          <!-- Sidebar -->
          <nav
            :class="[
              'lg:w-56 shrink-0 space-y-1.5',
              'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200/60 dark:border-neutral-800/60 p-5 overflow-y-auto transform transition-transform duration-300',
              isSidebarOpen
                ? 'translate-x-0'
                : '-translate-x-full lg:translate-x-0',
            ]"
          >
            <!-- Mobile close -->
            <div class="flex items-center justify-between mb-4 lg:hidden">
              <span
                class="text-sm font-semibold text-neutral-900 dark:text-white"
                >Navigation</span
              >
              <UButton
                variant="ghost"
                size="sm"
                square
                @click="isSidebarOpen = false"
              >
                <UIcon name="i-lucide-x" class="h-5 w-5" />
              </UButton>
            </div>

            <button
              v-for="section in sections"
              :key="section.id"
              @click="
                activeSection = section.id;
                isSidebarOpen = false;
              "
              :class="[
                'w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                activeSection === section.id
                  ? 'bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200/60 dark:border-green-800/60'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-white dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white border border-transparent',
              ]"
            >
              <UIcon :name="section.icon" class="h-4 w-4 shrink-0" />
              {{ section.label }}
            </button>
          </nav>

          <!-- Main Content -->
          <div class="flex-1 min-w-0">
            <div
              v-for="(section, key) in docContent"
              :key="key"
              :ref="
                (el) => {
                  if (el) (el as any).id = key;
                }
              "
            >
              <div
                v-if="activeSection === key"
                class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl p-8"
              >
                <!-- Section Header -->
                <div
                  class="flex items-center gap-3 mb-8 pb-6 border-b border-neutral-200/60 dark:border-neutral-800/60"
                >
                  <div
                    class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/50"
                  >
                    <UIcon
                      name="i-lucide-book-open"
                      class="h-5 w-5 text-green-600 dark:text-green-400"
                    />
                  </div>
                  <h1
                    class="text-2xl font-semibold font-aeonik-pro-trial text-neutral-900 dark:text-white"
                  >
                    {{ section.title }}
                  </h1>
                </div>

                <!-- Content Blocks -->
                <div class="space-y-6">
                  <template v-for="(block, bi) in section.content" :key="bi">
                    <!-- Paragraph -->
                    <p
                      v-if="block.type === 'p'"
                      class="text-neutral-600 dark:text-neutral-300 leading-relaxed"
                    >
                      {{ block.text }}
                    </p>

                    <!-- Heading 3 -->
                    <h3
                      v-else-if="block.type === 'h3'"
                      class="text-lg font-semibold text-neutral-900 dark:text-white"
                    >
                      {{ block.text }}
                    </h3>

                    <!-- Callout -->
                    <div
                      v-else-if="block.type === 'callout'"
                      :class="[
                        'rounded-xl p-4 border flex gap-3',
                        // @ts-ignore
                        block.variant === 'warning'
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/40'
                          : '',
                        // @ts-ignore
                        block.variant === 'info'
                          ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200/60 dark:border-blue-800/40'
                          : '',
                        // @ts-ignore
                        !block.variant || block.variant === 'default'
                          ? 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200/60 dark:border-neutral-800'
                          : '',
                      ]"
                    >
                      <UIcon
                        :name="
                          // @ts-ignore
                          block.variant === 'warning'
                            ? 'i-lucide-alert-triangle'
                            : // @ts-ignore
                              block.variant === 'info'
                              ? 'i-lucide-info'
                              : 'i-lucide-bookmark'
                        "
                        :class="[
                          'h-5 w-5 shrink-0 mt-0.5',
                          // @ts-ignore
                          block.variant === 'warning'
                            ? 'text-amber-600 dark:text-amber-400'
                            : '',
                          // @ts-ignore
                          block.variant === 'info'
                            ? 'text-blue-600 dark:text-blue-400'
                            : '',
                          // @ts-ignore
                          !block.variant || block.variant === 'default'
                            ? 'text-neutral-500 dark:text-neutral-400'
                            : '',
                        ]"
                      />
                      <div>
                        <p
                          v-if="block.title as string"
                          class="text-sm font-semibold text-neutral-900 dark:text-white mb-1"
                        >
                          {{ block.title }}
                        </p>
                        <p
                          class="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed"
                        >
                          {{ block.text }}
                        </p>
                      </div>
                    </div>

                    <!-- List -->
                    <ul v-else-if="block.type === 'list'" class="space-y-2.5">
                      <li
                        v-for="(item, li) in block.items"
                        :key="li"
                        class="flex items-start gap-3 text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed"
                      >
                        <UIcon
                          name="i-lucide-check-circle-2"
                          class="h-4 w-4 text-green-500 shrink-0 mt-0.5"
                        />
                        {{ item }}
                      </li>
                    </ul>

                    <!-- Code -->
                    <div
                      v-else-if="block.type === 'code'"
                      class="bg-neutral-900 dark:bg-black rounded-xl overflow-hidden"
                    >
                      <div
                        class="flex items-center justify-between px-4 py-2.5 border-b border-white/5"
                      >
                        <div class="flex items-center gap-2">
                          <span class="w-3 h-3 rounded-full bg-red-500/70" />
                          <span class="w-3 h-3 rounded-full bg-yellow-500/70" />
                          <span class="w-3 h-3 rounded-full bg-green-500/70" />
                        </div>
                        <span class="text-xs text-neutral-500 font-mono">{{
                          block.language
                        }}</span>
                      </div>
                      <pre
                        class="p-5 overflow-x-auto text-sm text-green-400 font-mono leading-relaxed"
                      ><code>{{ block.code }}</code></pre>
                    </div>
                  </template>
                </div>

                <!-- Navigation -->
                <div
                  class="mt-10 pt-6 border-t border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between"
                >
                  <button
                    v-if="sections.findIndex((s) => s.id === key) > 0"
                    @click="
                      activeSection =
                        // @ts-ignore
                        sections[sections.findIndex((s) => s.id === key) - 1].id
                    "
                    class="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                  >
                    <UIcon name="i-lucide-arrow-left" class="h-4 w-4" />
                    Previous
                  </button>
                  <div v-else />
                  <button
                    v-if="
                      sections.findIndex((s) => s.id === key) <
                      sections.length - 1
                    "
                    @click="
                      activeSection =
                        // @ts-ignore
                        sections[sections.findIndex((s) => s.id === key) + 1].id
                    "
                    class="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors font-medium"
                  >
                    Next
                    <UIcon name="i-lucide-arrow-right" class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

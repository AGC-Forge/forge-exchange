<script setup lang="ts">
definePageMeta({ layout: "default" });

const { t } = useI18n();
const locale = useLocalePath();

useSeoMeta({
  title: "Frequently Asked Questions — Forge Exchange",
  description:
    "Find answers to the most common questions about Forge Exchange traffic exchange platform.",
});

const categories = ["general", "billing", "technical", "campaigns"] as const;
const activeCategory = ref<string>("general");

const faqItems = computed(() => ({
  general: [
    { q: t("faq.items.whatIs.q"), a: t("faq.items.whatIs.a") },
    { q: t("faq.items.howItWorks.q"), a: t("faq.items.howItWorks.a") },
    { q: t("faq.items.gettingStarted.q"), a: t("faq.items.gettingStarted.a") },
    { q: t("faq.items.targeting.q"), a: t("faq.items.targeting.a") },
  ],
  billing: [
    { q: t("faq.items.credits.q"), a: t("faq.items.credits.a") },
    { q: t("faq.items.pricing.q"), a: t("faq.items.pricing.a") },
    { q: t("faq.items.refund.q"), a: t("faq.items.refund.a") },
  ],
  technical: [
    { q: t("faq.items.workerDeploy.q"), a: t("faq.items.workerDeploy.a") },
    { q: t("faq.items.api.q"), a: t("faq.items.api.a") },
  ],
  campaigns: [
    { q: t("faq.items.integrations.q"), a: t("faq.items.integrations.a") },
  ],
}));

const currentItems = computed(
  () =>
    faqItems.value[activeCategory.value as keyof typeof faqItems.value] || [],
);

// Search
const searchQuery = ref("");
const filteredItems = computed(() => {
  if (!searchQuery.value) return currentItems.value;
  const q = searchQuery.value.toLowerCase();
  return currentItems.value.filter(
    (item) =>
      item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q),
  );
});
</script>

<template>
  <div>
    <!-- Page Header -->
    <section
      class="bg-white dark:bg-neutral-950 border-b border-neutral-200/50 dark:border-neutral-800/50"
    >
      <div
        class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20 text-center"
      >
        <h1
          class="font-aeonik-pro-trial text-4xl sm:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight mb-4"
        >
          {{ t("faq.title") }}
        </h1>
        <p
          class="text-lg text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto mb-8"
        >
          {{ t("faq.subtitle") }}
        </p>

        <!-- Search -->
        <div class="max-w-xl mx-auto">
          <div class="relative">
            <UIcon
              name="i-lucide-search"
              class="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400"
            />
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('faq.search.placeholder')"
              class="w-full pl-12 pr-4 py-3.5 text-base bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all duration-200"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Content -->
    <section class="py-16 lg:py-24 bg-neutral-50 dark:bg-neutral-900/50">
      <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <!-- Category Sidebar -->
          <div class="lg:col-span-1">
            <nav class="space-y-1.5 sticky top-24">
              <button
                v-for="cat in categories"
                :key="cat"
                @click="activeCategory = cat"
                :class="[
                  'w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  activeCategory === cat
                    ? 'bg-green-500 text-white shadow-sm shadow-green-500/20'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-white dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700',
                ]"
              >
                {{ t(`faq.categories.${cat}`) }}
              </button>
            </nav>
          </div>

          <!-- Accordion -->
          <div class="lg:col-span-3">
            <div v-if="filteredItems.length === 0" class="text-center py-16">
              <UIcon
                name="i-lucide-search-x"
                class="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4"
              />
              <p class="text-neutral-500 dark:text-neutral-400">
                No results found for "{{ searchQuery }}"
              </p>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="(item, index) in filteredItems"
                :key="index"
                class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-xl overflow-hidden"
              >
                <UAccordion
                  :items="[
                    { label: item.q, content: item.a, defaultOpen: false },
                  ]"
                  variant="ghost"
                  class="w-full"
                >
                  <template #content="{ item }">
                    <div class="px-5 pb-5 pt-2">
                      <p
                        class="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed"
                      >
                        {{ item.content }}
                      </p>
                    </div>
                  </template>
                </UAccordion>
              </div>
            </div>

            <!-- Still have questions? -->
            <div
              class="mt-10 text-center p-8 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl"
            >
              <h3
                class="text-lg font-semibold text-neutral-900 dark:text-white mb-2"
              >
                Still have questions?
              </h3>
              <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
                Can't find the answer you're looking for? Reach out to our
                support team.
              </p>
              <NuxtLink :to="locale('/contact')">
                <UButton
                  class="bg-green-500 hover:bg-green-600 text-white shadow-sm shadow-green-500/20 font-semibold"
                >
                  Contact Support
                  <template #trailing>
                    <UIcon name="i-lucide-arrow-right" class="h-4 w-4" />
                  </template>
                </UButton>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

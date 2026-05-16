<script setup lang="ts">
definePageMeta({ layout: "default" });

const { t, messages, locale } = useI18n();
const localePath = useLocalePath();

useSeoMeta({
  title: "Terms of Service — Smart Boost Labs",
  description:
    "Smart Boost Labs Terms of Service. Read our terms and conditions for using our platform.",
});

const localeMessages = computed(() => messages.value as Record<string, any>);
const finalTermsSections = computed(() => {
  return (
    (localeMessages.value?.[locale.value as string]?.terms.sections as Record<
      string,
      any
    >[]) || []
  );
});

function textOf(raw: any): string {
  if (typeof raw === "string") return raw;
  const maybe = raw?.body?.static;
  if (typeof maybe === "string") return maybe;
  return "";
}

const sections = computed(() => [
  {
    title: (finalTermsSections.value as any).acceptance.title,
    content: (finalTermsSections.value as any).acceptance.content,
  },
  {
    title: (finalTermsSections.value as any).service.title,
    content: (finalTermsSections.value as any).service.content,
  },
  {
    title: (finalTermsSections.value as any).account.title,
    content: (finalTermsSections.value as any).account.content,
  },
  {
    title: (finalTermsSections.value as any).acceptableUse.title,
    content: (finalTermsSections.value as any).acceptableUse.content,
  },
  {
    title: (finalTermsSections.value as any).credits.title,
    content: (finalTermsSections.value as any).credits.content,
  },
  {
    title: (finalTermsSections.value as any).workers.title,
    content: (finalTermsSections.value as any).workers.content,
  },
  {
    title: (finalTermsSections.value as any).data.title,
    content: (finalTermsSections.value as any).data.content,
  },
  {
    title: (finalTermsSections.value as any).intellectualProperty.title,
    content: (finalTermsSections.value as any).intellectualProperty.content,
  },
  {
    title: (finalTermsSections.value as any).termination.title,
    content: (finalTermsSections.value as any).termination.content,
  },
  {
    title: (finalTermsSections.value as any).disclaimer.title,
    content: (finalTermsSections.value as any).disclaimer.content,
  },
  {
    title: (finalTermsSections.value as any).limitation.title,
    content: (finalTermsSections.value as any).limitation.content,
  },
  {
    title: (finalTermsSections.value as any).changes.title,
    content: (finalTermsSections.value as any).changes.content,
  },
  {
    title: (finalTermsSections.value as any).governing.title,
    content: (finalTermsSections.value as any).governing.content,
  },
  {
    title: (finalTermsSections.value as any).contact.title,
    content: (finalTermsSections.value as any).contact.content,
  },
]);
</script>

<template>
  <div>
    <!-- Page Header -->
    <section
      class="bg-white dark:bg-neutral-950 border-b border-neutral-200/50 dark:border-neutral-800/50"
    >
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div class="max-w-3xl">
          <nav
            class="text-sm text-neutral-500 dark:text-neutral-400 mb-4 flex items-center gap-2"
          >
            <NuxtLink
              :to="localePath('/')"
              class="hover:text-green-600 dark:hover:text-green-400 transition-colors"
            >
              Home
            </NuxtLink>
            <UIcon name="i-lucide-chevron-right" class="h-4 w-4" />
            <span class="text-neutral-900 dark:text-white">{{
              t("terms.title")
            }}</span>
          </nav>
          <h1
            class="font-aeonik-pro-trial text-4xl sm:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight mb-4"
          >
            {{ t("terms.title") }}
          </h1>
          <p class="text-neutral-500 dark:text-neutral-400">
            {{ t("terms.lastUpdated") }}
          </p>
        </div>
      </div>
    </section>

    <!-- Content -->
    <section class="py-16 lg:py-24 bg-neutral-50 dark:bg-neutral-900/50">
      <div class="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
        <div
          class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl p-8 lg:p-12"
        >
          <div class="prose prose-neutral dark:prose-invert max-w-none">
            <div
              v-for="(section, index) in sections"
              :key="index"
              class="mb-10 last:mb-0"
            >
              <h2
                class="text-xl font-semibold text-neutral-900 dark:text-white mb-4 flex items-start gap-3"
              >
                <span
                  class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-400 text-sm font-bold shrink-0 mt-0.5"
                >
                  {{ (index as number) + 1 }}
                </span>
                {{ textOf(section.title) }}
              </h2>
              <div class="pl-11 space-y-3">
                <p
                  class="text-neutral-600 dark:text-neutral-300 leading-relaxed"
                >
                  {{ textOf(section.content) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom CTA -->
        <div
          class="mt-10 text-center p-8 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl"
        >
          <h3
            class="text-lg font-semibold text-neutral-900 dark:text-white mb-2"
          >
            Questions about our terms?
          </h3>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
            Our legal team is here to help.
          </p>
          <NuxtLink :to="localePath('/contact')">
            <UButton
              class="bg-green-500 hover:bg-green-600 text-white shadow-sm shadow-green-500/20 font-semibold"
            >
              Contact Us
            </UButton>
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

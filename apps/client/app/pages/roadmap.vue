<script setup lang="ts">
definePageMeta({ layout: "default" });

const { t, locale, messages } = useI18n();
const localePath = useLocalePath();

useSeoMeta({
  title: "Roadmap — Smart Boost Labs",
  description:
    "Learn about Smart Boost Labs — the AI-powered traffic exchange platform. Our mission, vision, team, and technology.",
  ogTitle: "Roadmap — Smart Boost Labs",
  ogDescription:
    "Learn about Smart Boost Labs — the AI-powered traffic exchange platform.",
});

const localeMessages = computed(() => messages.value as Record<string, any>);
const finalAbout = computed(() => {
  return (localeMessages.value?.[locale.value as string]?.about as any) || {};
});

function textOf(raw: any): string {
  if (typeof raw === "string") return raw;
  const maybe = raw?.body?.static;
  if (typeof maybe === "string") return maybe;
  return "";
}

const milestones = computed(() => [
  {
    date: textOf(finalAbout.value.milestones.items.m1.date),
    title: textOf(finalAbout.value.milestones.items.m1.title),
    description: textOf(finalAbout.value.milestones.items.m1.description),
  },
  {
    date: textOf(finalAbout.value.milestones.items.m2.date),
    title: textOf(finalAbout.value.milestones.items.m2.title),
    description: textOf(finalAbout.value.milestones.items.m2.description),
  },
  {
    date: textOf(finalAbout.value.milestones.items.m3.date),
    title: textOf(finalAbout.value.milestones.items.m3.title),
    description: textOf(finalAbout.value.milestones.items.m3.description),
  },
  {
    date: textOf(finalAbout.value.milestones.items.m4.date),
    title: textOf(finalAbout.value.milestones.items.m4.title),
    description: textOf(finalAbout.value.milestones.items.m4.description),
  },
  {
    date: textOf(finalAbout.value.milestones.items.m5.date),
    title: textOf(finalAbout.value.milestones.items.m5.title),
    description: textOf(finalAbout.value.milestones.items.m5.description),
  },
  {
    date: textOf(finalAbout.value.milestones.items.m6.date),
    title: textOf(finalAbout.value.milestones.items.m6.title),
    description: textOf(finalAbout.value.milestones.items.m6.description),
  },
]);
</script>

<template>
  <div class="relative overflow-hidden">
    <GreenParticleBackground
      :particle-count="80"
      color="#22c55e"
      :size="{ min: 1, max: 4 }"
      speed="normal"
      gradient-from="transparent"
      gradient-to="rgba(34, 197, 94, 0.12)"
    />
    <section class="py-20 lg:py-28 container max-w-7xl mx-auto">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <span
            class="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 mb-4"
          >
            <UIcon name="i-lucide-flag" class="h-4 w-4" />
            {{ t("about.milestones.label") }}
          </span>
          <h2
            class="font-aeonik-pro-trial text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight mb-4"
          >
            {{ t("about.milestones.title") }}
          </h2>
          <p
            class="text-lg text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto"
          >
            {{ t("about.milestones.subtitle") }}
          </p>
        </div>

        <!-- Timeline -->
        <div
          class="relative bg-default px-4 sm:px-6 lg:px-8 rounded-md border border-primary"
        >
          <!-- Vertical line -->
          <div
            class="hidden lg:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-linear-to-b from-green-300 via-neutral-300 to-green-300 dark:from-green-800 dark:via-neutral-700 dark:to-green-800"
          />

          <div class="space-y-8">
            <div
              v-for="(milestone, i) in milestones"
              :key="i"
              :class="[
                'relative flex flex-col lg:flex-row items-center gap-6',
                i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse',
              ]"
            >
              <!-- Dot -->
              <div
                class="hidden lg:flex w-8 h-8 rounded-full bg-linear-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/25 items-center justify-center z-10 shrink-0"
              >
                <div class="w-2.5 h-2.5 rounded-full bg-white" />
              </div>

              <!-- Card -->
              <div
                :class="[
                  'flex-1 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl p-6 lg:max-w-sm hover:border-green-300 dark:hover:border-green-700/50 transition-all duration-300',
                  i % 2 === 0 ? 'lg:text-right' : 'lg:text-left',
                ]"
              >
                <div
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 dark:bg-green-950/50 border border-green-200/50 dark:border-green-800/50 text-xs font-semibold text-green-700 dark:text-green-300 mb-3"
                >
                  <UIcon name="i-lucide-calendar" class="h-3 w-3" />
                  {{ milestone.date }}
                </div>
                <h4
                  class="text-base font-semibold text-neutral-900 dark:text-white mb-2"
                >
                  {{ milestone.title }}
                </h4>
                <p
                  class="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed"
                >
                  {{ milestone.description }}
                </p>
              </div>

              <!-- Empty spacer for opposite side -->
              <div class="hidden lg:flex flex-1" />
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default" });

const { t, locale, messages } = useI18n();
const localePath = useLocalePath();

useSeoMeta({
  title: "About — Forge Exchange",
  description:
    "Learn about Forge Exchange — the AI-powered traffic exchange platform. Our mission, vision, team, and technology.",
  ogTitle: "About — Forge Exchange",
  ogDescription:
    "Learn about Forge Exchange — the AI-powered traffic exchange platform.",
});

const localeMessages = computed(() => messages.value as Record<string, any>);
const finalAbout = computed(() => {
  return (localeMessages.value?.[locale.value as string]?.about as any) || {};
});

const values = computed(() => [
  {
    icon: valuesIconMap.innovation || "i-lucide-sparkles",
    title: finalAbout.value.values.items.innovation.title.body.static,
    description:
      finalAbout.value.values.items.innovation.description.body.static,
  },
  {
    icon: valuesIconMap.transparency || "i-lucide-shield-check",
    title: finalAbout.value.values.items.transparency.title.body.static,
    description:
      finalAbout.value.values.items.transparency.description.body.static,
  },
  {
    icon: valuesIconMap.userFocus || "i-lucide-heart-handshake",
    title: finalAbout.value.values.items.userFocus.title.body.static,
    description:
      finalAbout.value.values.items.userFocus.description.body.static,
  },
  {
    icon: valuesIconMap.reliability || "i-lucide-server-cog",
    title: finalAbout.value.values.items.reliability.title.body.static,
    description:
      finalAbout.value.values.items.reliability.description.body.static,
  },
]);

const valuesIconMap: Record<string, string> = {
  innovation: "i-lucide-sparkles",
  transparency: "i-lucide-shield-check",
  userFocus: "i-lucide-heart-handshake",
  reliability: "i-lucide-server-cog",
};

const techStack = computed(() => [
  {
    category: t("about.tech.stack.frontend"),
    items: ["Nuxt 4", "Vue 3", "TypeScript", "Tailwind CSS v4", "Zod"],
    icon: "i-lucide-monitor",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    category: t("about.tech.stack.backend"),
    items: ["Node.js", "PostgreSQL", "Redis", "BullMQ", "Prisma"],
    icon: "i-lucide-database",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    category: t("about.tech.stack.infrastructure"),
    items: ["Vercel", "Docker", "Playwright", "Nginx", "Cloudflare"],
    icon: "i-lucide-cloud",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
]);

const milestones = computed(() => [
  {
    date: finalAbout.value.milestones.items.m1.date.body.static,
    title: finalAbout.value.milestones.items.m1.title.body.static,
    description: finalAbout.value.milestones.items.m1.description.body.static,
  },
  {
    date: finalAbout.value.milestones.items.m2.date.body.static,
    title: finalAbout.value.milestones.items.m2.title.body.static,
    description: finalAbout.value.milestones.items.m2.description.body.static,
  },
  {
    date: finalAbout.value.milestones.items.m3.date.body.static,
    title: finalAbout.value.milestones.items.m3.title.body.static,
    description: finalAbout.value.milestones.items.m3.description.body.static,
  },
  {
    date: finalAbout.value.milestones.items.m4.date.body.static,
    title: finalAbout.value.milestones.items.m4.title.body.static,
    description: finalAbout.value.milestones.items.m4.description.body.static,
  },
  {
    date: finalAbout.value.milestones.items.m5.date.body.static,
    title: finalAbout.value.milestones.items.m5.title.body.static,
    description: finalAbout.value.milestones.items.m5.description.body.static,
  },
  {
    date: finalAbout.value.milestones.items.m6.date.body.static,
    title: finalAbout.value.milestones.items.m6.title.body.static,
    description: finalAbout.value.milestones.items.m6.description.body.static,
  },
]);

// console.log(finalAbout.value.mission.points.efficiency.body.static);
const missionPoints = computed(() => [
  {
    icon: missionPointIconMap.efficiency || "i-lucide-trending-up",
    text: finalAbout.value.mission.points.efficiency.body.static,
  },
  {
    icon: missionPointIconMap.quality || "i-lucide-users",
    text: finalAbout.value.mission.points.quality.body.static,
  },
  {
    icon: missionPointIconMap.transparency || "i-lucide-bar-chart-3",
    text: finalAbout.value.mission.points.transparency.body.static,
  },
  {
    icon: missionPointIconMap.simplicity || "i-lucide-rocket",
    text: finalAbout.value.mission.points.simplicity.body.static,
  },
]);

const missionPointIconMap: Record<string, string> = {
  efficiency: "i-lucide-trending-up",
  quality: "i-lucide-users",
  transparency: "i-lucide-bar-chart-3",
  simplicity: "i-lucide-rocket",
};

const teamMembers = [
  {
    initials: "RD",
    name: "Rizki Dharma",
    role: "Founder & CEO",
    bg: "bg-linear-to-br from-green-400 to-green-600",
    textColor: "text-white",
    github: "#",
  },
  {
    initials: "AS",
    name: "Ahmad Santoso",
    role: "CTO",
    bg: "bg-linear-to-br from-blue-400 to-blue-600",
    textColor: "text-white",
    github: "#",
  },
  {
    initials: "DW",
    name: "Dewi Wahyuni",
    role: "Lead Designer",
    bg: "bg-linear-to-br from-purple-400 to-purple-600",
    textColor: "text-white",
    github: "#",
  },
  {
    initials: "BP",
    name: "Budi Prasetyo",
    role: "Senior Engineer",
    bg: "bg-linear-to-br from-orange-400 to-orange-600",
    textColor: "text-white",
    github: "#",
  },
];

function normalizeI18n(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f: any) => {
      if (typeof f === "string") return f;
      const maybe = f?.body?.static;
      if (typeof maybe === "string") return maybe;
      return "";
    })
    .filter(Boolean);
}
</script>

<template>
  <div>
    <!-- ====== HERO ====== -->
    <section class="relative overflow-hidden">
      <!-- Background -->
      <GreenParticleBackground
        :particle-count="80"
        color="#22c55e"
        :size="{ min: 1, max: 4 }"
        speed="normal"
        gradient-from="transparent"
        gradient-to="rgba(34, 197, 94, 0.12)"
      />
      <div class="absolute inset-0 -z-10">
        <div
          class="absolute inset-0 opacity-[0.035] dark:opacity-[0.04]"
          :style="{
            backgroundImage:
              'linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }"
        />
        <div
          class="absolute -left-40 -top-40 w-125 h-125 rounded-full bg-linear-to-br from-green-400/20 via-green-500/10 to-transparent blur-3xl dark:from-green-500/10 dark:via-green-600/5 dark:to-transparent pointer-events-none"
        />
        <div
          class="absolute -right-40 top-20 w-100 h-100 rounded-full bg-linear-to-bl from-purple-400/10 via-purple-500/5 to-transparent blur-3xl dark:from-purple-500/5 dark:via-purple-600/2 dark:to-transparent pointer-events-none"
        />
      </div>

      <div
        class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-32 lg:pb-40"
      >
        <div class="text-center max-w-4xl mx-auto">
          <!-- Badge -->
          <div
            class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 dark:bg-green-950/50 border border-green-200/50 dark:border-green-800/50 text-sm text-green-700 dark:text-green-300 font-medium mb-8 animate-fade-in-up"
          >
            <UIcon name="i-lucide-heart" class="h-4 w-4" />
            {{ t("about.hero.badge") }}
          </div>

          <!-- Title -->
          <h1
            class="font-aeonik-pro-trial text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.1] mb-6 animate-fade-in-up"
            style="animation-delay: 100ms"
          >
            {{ t("about.hero.title") }}
            <span
              class="block bg-linear-to-r from-green-500 via-green-400 to-green-500 bg-clip-text text-transparent"
            >
              {{ t("about.hero.titleHighlight") }}
            </span>
          </h1>

          <!-- Subtitle -->
          <p
            class="text-lg sm:text-xl text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-2xl mx-auto animate-fade-in-up"
            style="animation-delay: 200ms"
          >
            {{ t("about.hero.subtitle") }}
          </p>
        </div>
      </div>
    </section>

    <!-- ====== MISSION ====== -->
    <section class="py-20 lg:py-28 bg-white dark:bg-neutral-950">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
        >
          <!-- Left: Text -->
          <div>
            <span
              class="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 mb-4"
            >
              <UIcon name="i-lucide-target" class="h-4 w-4" />
              {{ t("about.mission.label") }}
            </span>
            <h2
              class="font-aeonik-pro-trial text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white tracking-tight mb-6"
            >
              {{ t("about.mission.title") }}
            </h2>
            <p
              class="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed mb-8"
            >
              {{ t("about.mission.description") }}
            </p>

            <!-- Points -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                v-for="point in missionPoints"
                :key="point.text"
                class="flex items-start gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/50"
              >
                <div
                  class="shrink-0 w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950/50 flex items-center justify-center"
                >
                  <UIcon
                    :name="point.icon"
                    class="h-5 w-5 text-green-600 dark:text-green-400"
                  />
                </div>
                <span
                  class="text-sm font-medium text-neutral-700 dark:text-neutral-200 pt-1"
                >
                  {{ point.text }}
                </span>
              </div>
            </div>
          </div>

          <!-- Right: Illustration card -->
          <div
            class="relative bg-linear-to-br from-neutral-50 to-green-50 dark:from-neutral-900 dark:to-green-950/20 border border-neutral-200/60 dark:border-neutral-800/60 rounded-3xl p-10 text-center"
          >
            <!-- Decoration -->
            <div
              class="absolute top-6 right-6 w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center"
            >
              <UIcon name="i-lucide-globe" class="h-10 w-10 text-green-500" />
            </div>
            <div class="flex items-center justify-center gap-4 mb-6">
              <div
                class="w-20 h-20 rounded-2xl bg-linear-to-br from-green-400 to-green-600 flex items-center justify-center shadow-2xl shadow-green-500/20"
              >
                <svg
                  class="h-10 w-10 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
            </div>
            <h3
              class="font-aeonik-pro-trial text-2xl font-bold text-neutral-900 dark:text-white mb-2"
            >
              Forge Exchange
            </h3>
            <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              AI-Powered Traffic Exchange
            </p>

            <!-- Mini stats -->
            <div class="grid grid-cols-3 gap-4">
              <div class="text-center">
                <div
                  class="text-2xl font-bold font-aeonik-pro-trial text-green-600 dark:text-green-400"
                >
                  12K+
                </div>
                <div
                  class="text-xs text-neutral-500 dark:text-neutral-400 mt-1"
                >
                  Users
                </div>
              </div>
              <div class="text-center">
                <div
                  class="text-2xl font-bold font-aeonik-pro-trial text-green-600 dark:text-green-400"
                >
                  48K+
                </div>
                <div
                  class="text-xs text-neutral-500 dark:text-neutral-400 mt-1"
                >
                  Campaigns
                </div>
              </div>
              <div class="text-center">
                <div
                  class="text-2xl font-bold font-aeonik-pro-trial text-green-600 dark:text-green-400"
                >
                  140+
                </div>
                <div
                  class="text-xs text-neutral-500 dark:text-neutral-400 mt-1"
                >
                  Countries
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== VISION ====== -->
    <section class="py-20 lg:py-28 bg-neutral-50 dark:bg-neutral-900/50">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
        >
          <!-- Left: Visual -->
          <div class="order-2 lg:order-1">
            <div
              class="relative bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-3xl p-8 overflow-hidden"
            >
              <!-- Background blobs -->
              <div
                class="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-linear-to-br from-green-400/20 to-transparent blur-2xl pointer-events-none"
              />
              <div
                class="absolute -left-16 -bottom-16 w-48 h-48 rounded-full bg-linear-to-tr from-purple-400/20 to-transparent blur-2xl pointer-events-none"
              />

              <div class="relative z-10">
                <div class="flex items-center gap-3 mb-8">
                  <UIcon name="i-lucide-eye" class="h-6 w-6 text-green-500" />
                  <span
                    class="text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider"
                  >
                    {{ t("about.vision.label") }}
                  </span>
                </div>

                <h3
                  class="font-aeonik-pro-trial text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-6 leading-tight"
                >
                  {{ t("about.vision.title") }}
                </h3>

                <p
                  class="text-neutral-600 dark:text-neutral-300 leading-relaxed mb-8"
                >
                  {{ t("about.vision.description") }}
                </p>

                <!-- Vision pillars -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div
                    class="text-center p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50"
                  >
                    <div
                      class="text-3xl font-bold font-aeonik-pro-trial text-green-600 dark:text-green-400 mb-1"
                    >
                      AI
                    </div>
                    <div class="text-xs text-neutral-500 dark:text-neutral-400">
                      Intelligent
                    </div>
                  </div>
                  <div
                    class="text-center p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50"
                  >
                    <div
                      class="text-3xl font-bold font-aeonik-pro-trial text-green-600 dark:text-green-400 mb-1"
                    >
                      🤝
                    </div>
                    <div class="text-xs text-neutral-500 dark:text-neutral-400">
                      Ethical
                    </div>
                  </div>
                  <div
                    class="text-center p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50"
                  >
                    <div
                      class="text-3xl font-bold font-aeonik-pro-trial text-green-600 dark:text-green-400 mb-1"
                    >
                      🌐
                    </div>
                    <div class="text-xs text-neutral-500 dark:text-neutral-400">
                      Accessible
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Text -->
          <div class="order-1 lg:order-2">
            <span
              class="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 mb-4"
            >
              <UIcon name="i-lucide-binoculars" class="h-4 w-4" />
              {{ t("about.vision.label") }}
            </span>
            <h2
              class="font-aeonik-pro-trial text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white tracking-tight mb-6"
            >
              {{ t("about.vision.title") }}
            </h2>
            <p
              class="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed mb-8"
            >
              {{ t("about.vision.description") }}
            </p>

            <!-- Visual -->
            <div
              class="relative rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center"
            >
              <UIcon
                name="i-lucide-sparkles"
                class="h-12 w-12 text-green-500 mx-auto mb-4"
              />
              <p class="text-sm text-neutral-500 dark:text-neutral-400">
                The future of traffic is here
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== VALUES ====== -->
    <section class="py-20 lg:py-28 bg-white dark:bg-neutral-950">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <span
            class="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 mb-4"
          >
            <UIcon name="i-lucide-compass" class="h-4 w-4" />
            {{ t("about.values.title") }}
          </span>
          <h2
            class="font-aeonik-pro-trial text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight mb-4"
          >
            {{ t("about.values.title") }}
          </h2>
          <p
            class="text-lg text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto"
          >
            {{ t("about.values.subtitle") }}
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="(value, i) in values"
            :key="i"
            class="group relative bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl p-7 hover:border-green-300 dark:hover:border-green-700/50 hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300"
          >
            <div
              class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/50 mb-5 group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors"
            >
              <UIcon
                :name="value.icon"
                class="h-6 w-6 text-green-600 dark:text-green-400"
              />
            </div>

            <h3
              class="text-lg font-semibold text-neutral-900 dark:text-white mb-2"
            >
              {{ value.title }}
            </h3>
            <p
              class="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed"
            >
              {{ value.description }}
            </p>

            <!-- Corner accent -->
            <div
              class="absolute top-4 right-4 w-2 h-2 rounded-full bg-green-500 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- ====== TEAM ====== -->
    <section class="py-20 lg:py-28 bg-neutral-50 dark:bg-neutral-900/50">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <span
            class="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 mb-4"
          >
            <UIcon name="i-lucide-users" class="h-4 w-4" />
            {{ t("about.team.label") }}
          </span>
          <h2
            class="font-aeonik-pro-trial text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight mb-4"
          >
            {{ t("about.team.title") }}
          </h2>
          <p
            class="text-lg text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto"
          >
            {{ t("about.team.subtitle") }}
          </p>
        </div>

        <!-- Team members grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
          <div
            v-for="(member, i) in teamMembers"
            :key="i"
            class="group relative bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl p-6 text-center hover:border-green-300 dark:hover:border-green-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/5"
          >
            <!-- Avatar -->
            <div
              :class="[
                'w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold font-aeonik-pro-trial',
                member.bg,
                member.textColor,
              ]"
            >
              {{ member.initials }}
            </div>
            <h4
              class="text-sm font-semibold text-neutral-900 dark:text-white mb-1"
            >
              {{ member.name }}
            </h4>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">
              {{ member.role }}
            </p>
            <div class="flex items-center justify-center gap-2 mt-3">
              <a
                v-if="member.github"
                :href="member.github"
                target="_blank"
                class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <!-- Join CTA -->
        <div class="text-center">
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
            {{ t("about.team.join") }}
          </p>
          <NuxtLink :to="localePath('/contact')">
            <UButton variant="outline" size="sm">
              {{ t("about.team.joinLink") }}
              <template #trailing>
                <UIcon name="i-lucide-arrow-right" class="h-4 w-4" />
              </template>
            </UButton>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ====== TECH STACK ====== -->
    <section class="py-20 lg:py-28 bg-white dark:bg-neutral-950">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <span
            class="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 mb-4"
          >
            <UIcon name="i-lucide-code-2" class="h-4 w-4" />
            {{ t("about.tech.label") }}
          </span>
          <h2
            class="font-aeonik-pro-trial text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight mb-4"
          >
            {{ t("about.tech.title") }}
          </h2>
          <p
            class="text-lg text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto"
          >
            {{ t("about.tech.subtitle") }}
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            v-for="stack in techStack"
            :key="stack.category"
            class="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl p-8"
          >
            <div
              :class="[
                'inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5',
                stack.bg,
              ]"
            >
              <UIcon :name="stack.icon" :class="['h-6 w-6', stack.color]" />
            </div>
            <h3
              class="text-lg font-semibold text-neutral-900 dark:text-white mb-5"
            >
              {{ stack.category }}
            </h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="item in stack.items"
                :key="item"
                class="px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
              >
                {{ item }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== MILESTONES TIMELINE ====== -->
    <section class="py-20 lg:py-28 bg-neutral-50 dark:bg-neutral-900/50">
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
        <div class="relative">
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

    <!-- ====== CTA ====== -->
    <section class="py-20 lg:py-28 bg-white dark:bg-neutral-950">
      <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <div
          class="relative rounded-3xl bg-linear-to-br from-neutral-900 via-neutral-900 to-neutral-800 dark:from-neutral-800 dark:via-neutral-900 dark:to-black p-12 lg:p-16 overflow-hidden"
        >
          <!-- Background decoration -->
          <div
            class="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-linear-to-br from-green-500/20 to-purple-500/10 blur-3xl pointer-events-none"
          />
          <div
            class="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-linear-to-tr from-green-400/10 to-transparent blur-2xl pointer-events-none"
          />

          <div class="relative z-10">
            <h2
              class="font-aeonik-pro-trial text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4"
            >
              {{ t("about.cta.title") }}
            </h2>
            <p class="text-lg text-neutral-300 mb-10 max-w-xl mx-auto">
              {{ t("about.cta.subtitle") }}
            </p>
            <div
              class="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <NuxtLink :to="localePath('/register?plan=free')">
                <UButton
                  size="xl"
                  class="bg-green-500 hover:bg-green-600 text-white shadow-xl shadow-green-500/20 font-semibold px-10"
                >
                  {{ t("about.cta.primary") }}
                  <template #trailing>
                    <UIcon name="i-lucide-arrow-right" class="h-5 w-5" />
                  </template>
                </UButton>
              </NuxtLink>
              <NuxtLink :to="localePath('/contact')">
                <UButton
                  size="xl"
                  variant="outline"
                  class="text-white border-white/30 hover:bg-white/10 font-semibold px-10"
                >
                  {{ t("about.cta.secondary") }}
                </UButton>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default" });

const { t, locale, messages } = useI18n();
const { user } = useUserSession();
const localePath = useLocalePath();
const config = useRuntimeConfig();

useSeoMeta({
  title: "Forge Exchange — AI-Powered Traffic Exchange Platform",
  description:
    "Maximize your website traffic through our AI-optimized traffic exchange network. Real-time analytics, smart campaign management, and seamless integrations.",
  ogTitle: "Forge Exchange — AI-Powered Traffic Exchange Platform",
  ogDescription:
    "Maximize your website traffic through our AI-optimized traffic exchange network.",
  twitterCard: "summary_large_image",
});

const statsVisible = ref(false);
const statsRef = ref<HTMLElement | null>(null);

const stats = computed(() => [
  {
    value: "12,500+",
    label: t("hero.stats.activeUsers"),
    icon: "i-lucide-users",
  },
  {
    value: "48,000+",
    label: t("hero.stats.campaigns"),
    icon: "i-lucide-megaphone",
  },
  {
    value: "2.5M+",
    label: t("hero.stats.dailyImpressions"),
    icon: "i-lucide-eye",
  },
  { value: "140+", label: t("hero.stats.countries"), icon: "i-lucide-globe" },
]);

const features = computed(() => [
  {
    icon: "i-lucide-brain",
    iconBg: "bg-purple-500/10 dark:bg-purple-500/20",
    iconColor: "text-purple-600 dark:text-purple-400",
    title: t("features.items.aiRouting.title"),
    description: t("features.items.aiRouting.description"),
    badge: "AI",
  },
  {
    icon: "i-lucide-activity",
    iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    title: t("features.items.realTimeAnalytics.title"),
    description: t("features.items.realTimeAnalytics.description"),
    badge: "Live",
  },
  {
    icon: "i-lucide-rocket",
    iconBg: "bg-green-500/10 dark:bg-green-500/20",
    iconColor: "text-green-600 dark:text-green-400",
    title: t("features.items.smartCampaigns.title"),
    description: t("features.items.smartCampaigns.description"),
    badge: "Smart",
  },
  {
    icon: "i-lucide-server-cog",
    iconBg: "bg-orange-500/10 dark:bg-orange-500/20",
    iconColor: "text-orange-600 dark:text-orange-400",
    title: t("features.items.workerSystem.title"),
    description: t("features.items.workerSystem.description"),
    badge: "Scale",
  },
  {
    icon: "material-symbols-light:vpn-lock-rounded",
    iconBg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    title: t("features.items.proxyIntegration.title"),
    description: t("features.items.proxyIntegration.description"),
    badge: "Geo",
  },
  {
    icon: "i-lucide-plug",
    iconBg: "bg-pink-500/10 dark:bg-pink-500/20",
    iconColor: "text-pink-600 dark:text-pink-400",
    title: t("features.items.integrationHub.title"),
    description: t("features.items.integrationHub.description"),
    badge: "API",
  },
]);

const localeMessages = computed(() => messages.value as Record<string, any>);

const finalPlans = computed(() => {
  return (localeMessages.value?.[locale.value as string]?.pricing as any) || {};
});

const plans = computed(() => [
  {
    id: "free",
    name: t("pricing.free.name"),
    price: t("pricing.free.price"),
    period: t("pricing.free.period"),
    description: t("pricing.free.description"),
    features: finalPlans.value.free?.features || [],
    cta: t("pricing.free.cta"),
    variant: "outline" as const,
  },
  {
    id: "starter",
    name: t("pricing.starter.name"),
    price: t("pricing.starter.price"),
    period: t("pricing.starter.period"),
    description: t("pricing.starter.description"),
    features: finalPlans.value.starter?.features || [],
    cta: t("pricing.starter.cta"),
    variant: "outline" as const,
  },
  {
    id: "pro",
    name: t("pricing.pro.name"),
    price: t("pricing.pro.price"),
    period: t("pricing.pro.period"),
    description: t("pricing.pro.description"),
    features: finalPlans.value.pro?.features || [],
    cta: t("pricing.pro.cta"),
    variant: "solid" as const,
    popular: true,
  },
  {
    id: "enterprise",
    name: t("pricing.enterprise.name"),
    price: t("pricing.enterprise.price"),
    period: t("pricing.enterprise.period"),
    description: t("pricing.enterprise.description"),
    features: finalPlans.value.enterprise?.features || [],
    cta: t("pricing.enterprise.cta"),
    variant: "outline" as const,
  },
]);

const steps = computed(() => [
  {
    number: "01",
    title: t("howItWorks.steps.step1.title"),
    description: t("howItWorks.steps.step1.description"),
    icon: "i-lucide-file-plus",
  },
  {
    number: "02",
    title: t("howItWorks.steps.step2.title"),
    description: t("howItWorks.steps.step2.description"),
    icon: "i-lucide-server",
  },
  {
    number: "03",
    title: t("howItWorks.steps.step3.title"),
    description: t("howItWorks.steps.step3.description"),
    icon: "i-lucide-rocket",
  },
]);

onMounted(() => {
  // console.log(localeMessages.value.en.pricing?.free.features[0].body.static);
  // console.log(finalPlans.value);
  // console.log(plans.value[0]?.features);
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          statsVisible.value = true;
          observer.disconnect();
        }
      });
    },
    { threshold: 0.3 },
  );
  if (statsRef.value) observer.observe(statsRef.value);
  onUnmounted(() => observer.disconnect());
});
</script>

<template>
  <div class="relative overflow-hidden min-h-screen">
    <GreenParticleBackground
      :particle-count="80"
      color="#22c55e"
      :size="{ min: 1, max: 4 }"
      speed="normal"
      gradient-from="transparent"
      gradient-to="rgba(34, 197, 94, 0.12)"
    />
    <section className="flex items-center justify-center px-4 ">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 lg:pt-32">
        <div class="text-center max-w-4xl mx-auto">
          <!-- Badge -->
          <div
            class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-amber-600/40 via-amber-600/30 to-amber-600/20 dark:from-amber-600/60 dark:via-amber-600/40 dark:to-amber-600/30 border border-amber-200/50 dark:border-amber-800/50 text-sm text-black dark:text-white font-medium mb-8 animate-fade-in-up shadow-lg"
          >
            <span class="relative flex h-2 w-2">
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 dark:bg-primary-400 opacity-75"
              />
              <span
                class="relative inline-flex rounded-full h-2 w-2 bg-primary-700 dark:bg-primary-600"
              />
            </span>
            {{ t("hero.badge") }}
          </div>

          <!-- Title -->
          <h1
            class="font-aeonik-pro-trial text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.08] mb-6 animate-fade-in-up"
            style="animation-delay: 100ms"
          >
            {{ t("hero.title") }}
            <span
              class="block bg-linear-to-r from-green-500 via-green-400 to-green-500 bg-clip-text text-transparent"
            >
              {{ t("hero.titleHighlight") }}
            </span>
          </h1>

          <!-- Subtitle -->
          <p
            class="text-lg sm:text-xl text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-2xl mx-auto mb-10 animate-fade-in-up"
            style="animation-delay: 200ms"
          >
            {{ t("hero.subtitle") }}
          </p>

          <!-- CTA Buttons -->
          <div
            class="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-16 animate-fade-in-up"
            style="animation-delay: 300ms"
          >
            <NuxtLink :to="localePath('/register?plan=free')">
              <UButton
                size="xl"
                class="bg-green-500 hover:bg-green-600 text-white shadow-xl shadow-green-500/20 font-semibold px-8"
              >
                {{ t("hero.cta.startFree") }}
                <template #trailing>
                  <UIcon name="i-lucide-arrow-right" class="h-5 w-5" />
                </template>
              </UButton>
            </NuxtLink>
            <NuxtLink :to="localePath('/docs')">
              <UButton size="xl" variant="outline" class="font-semibold px-8">
                {{ t("hero.cta.viewDocs") }}
                <template #trailing>
                  <UIcon name="i-lucide-book-open" class="h-5 w-5" />
                </template>
              </UButton>
            </NuxtLink>
          </div>

          <!-- Stats -->
          <div
            ref="statsRef"
            class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-fade-in-up"
            style="animation-delay: 400ms"
          >
            <div
              v-for="stat in stats"
              :key="stat.label"
              class="bg-white dark:bg-neutral-900 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-800/50 rounded-2xl p-5 text-center"
            >
              <div class="flex items-center justify-center gap-2 mb-2">
                <UIcon :name="stat.icon" class="h-4 w-4 text-green-500" />
              </div>
              <div
                class="text-2xl sm:text-3xl font-bold font-aeonik-pro-trial text-neutral-900 dark:text-white mb-1"
              >
                {{ stat.value }}
              </div>
              <div class="text-sm text-neutral-500 dark:text-neutral-400">
                {{ stat.label }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== FEATURES ====== -->
    <section id="features" class="py-20 lg:py-28">
      <GreenParticleBackground
        :particle-count="80"
        color="#22c55e"
        :size="{ min: 1, max: 4 }"
        speed="normal"
        gradient-from="transparent"
        gradient-to="rgba(34, 197, 94, 0.12)"
      />
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <span
            class="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 mb-4"
          >
            <UIcon name="i-lucide-zap" class="h-4 w-4" />
            Features
          </span>
          <h2
            class="font-aeonik-pro-trial text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight mb-4"
          >
            {{ t("features.title") }}
          </h2>
          <p
            class="text-lg text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto"
          >
            {{ t("features.subtitle") }}
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="(feature, i) in features"
            :key="i"
            class="group relative bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl p-7 hover:border-green-300 dark:hover:border-green-700/50 hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300"
          >
            <!-- Badge -->
            <div class="absolute top-4 right-4">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
              >
                {{ feature.badge }}
              </span>
            </div>

            <!-- Icon -->
            <div
              :class="[
                'inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5',
                feature.iconBg,
              ]"
            >
              <UIcon
                :name="feature.icon"
                :class="['h-6 w-6', feature.iconColor]"
              />
            </div>

            <!-- Content -->
            <h3
              class="text-lg font-semibold text-neutral-900 dark:text-white mb-2 pr-12"
            >
              {{ feature.title }}
            </h3>
            <p
              class="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed"
            >
              {{ feature.description }}
            </p>

            <!-- Hover arrow -->
            <div
              class="absolute bottom-7 right-7 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <UIcon
                name="i-lucide-arrow-right"
                class="h-4 w-4 text-green-500"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== HOW IT WORKS ====== -->
    <section class="py-20 lg:py-28 bg-neutral-50 dark:bg-neutral-900/50">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <span
            class="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 mb-4"
          >
            <UIcon name="i-lucide-book-open" class="h-4 w-4" />
            Quick Start
          </span>
          <h2
            class="font-aeonik-pro-trial text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight mb-4"
          >
            {{ t("howItWorks.title") }}
          </h2>
          <p
            class="text-lg text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto"
          >
            {{ t("howItWorks.subtitle") }}
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
          <!-- Connector line (desktop only) -->
          <div
            class="hidden lg:block absolute top-14 left-1/2 -translate-x-1/2 w-[calc(100%-64px)] h-px bg-linear-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent"
          />

          <div
            v-for="(step, i) in steps"
            :key="i"
            class="relative bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl p-8 text-center hover:shadow-xl hover:shadow-green-500/5 hover:border-green-300/50 dark:hover:border-green-700/50 transition-all duration-300"
          >
            <!-- Number -->
            <div
              class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-linear-to-br from-green-400 to-green-600 text-white font-aeonik-pro-trial text-xl font-bold mb-6 shadow-lg shadow-green-500/25"
            >
              {{ step.number }}
            </div>
            <div
              :class="[
                'inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4 mx-auto',
                'bg-green-50 dark:bg-green-950/50',
              ]"
            >
              <UIcon
                name="material-symbols:check-circle-outline"
                class="h-5 w-5 text-green-600 dark:text-green-400"
              />
            </div>
            <h3
              class="text-xl font-semibold text-neutral-900 dark:text-white mb-3"
            >
              {{ step.title }}
            </h3>
            <p
              class="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed"
            >
              {{ step.description }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== PRICING ====== -->
    <section id="pricing" class="py-20 lg:py-28 bg-default">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <span
            class="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 mb-4"
          >
            <UIcon name="i-lucide-tag" class="h-4 w-4" />
            Pricing
          </span>
          <h2
            class="font-aeonik-pro-trial text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight mb-4"
          >
            {{ t("pricing.title") }}
          </h2>
          <p
            class="text-lg text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto"
          >
            {{ t("pricing.subtitle") }}
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 lg:gap-8">
          <div
            v-for="(plan, i) in plans"
            :key="i"
            :class="[
              'relative rounded-2xl p-8 flex flex-col transition-all duration-300',
              plan.popular
                ? 'bg-linear-to-br from-green-500 via-green-500 to-green-600 text-white shadow-2xl shadow-green-500/25 ring-2 ring-green-400'
                : 'bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 hover:border-green-600 dark:hover:border-green-500 hover:shadow-xl hover:shadow-green-500/5',
            ]"
          >
            <!-- Popular badge -->
            <div
              v-if="plan.popular"
              class="absolute -top-4 left-1/2 -translate-x-1/2"
            >
              <span
                class="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-white text-green-600 text-sm font-semibold shadow-lg"
              >
                <UIcon name="i-lucide-sparkles" class="h-3.5 w-3.5" />
                Most Popular
              </span>
            </div>

            <div class="mb-6">
              <h3
                :class="[
                  'text-xl font-semibold mb-1',
                  plan.popular
                    ? 'text-white'
                    : 'text-neutral-900 dark:text-white',
                ]"
              >
                {{ plan.name }}
              </h3>
              <p
                :class="[
                  'text-sm leading-relaxed mb-4',
                  plan.popular
                    ? 'text-green-100'
                    : 'text-neutral-500 dark:text-neutral-400',
                ]"
              >
                {{ plan.description }}
              </p>
              <div class="flex items-end gap-1">
                <span
                  :class="[
                    'text-4xl font-bold font-aeonik-pro-trial',
                    plan.popular
                      ? 'text-white'
                      : 'text-neutral-900 dark:text-white',
                  ]"
                >
                  {{ plan.price }}
                </span>
                <span
                  v-if="plan.period"
                  :class="[
                    'text-sm font-medium mb-1.5',
                    plan.popular
                      ? 'text-green-100'
                      : 'text-neutral-500 dark:text-neutral-400',
                  ]"
                >
                  {{ plan.period }}
                </span>
              </div>
            </div>

            <ul class="space-y-3 mb-8 flex-1">
              <li
                v-for="(feature, fi) in plan.features"
                :key="fi"
                class="flex items-start gap-2.5"
              >
                <UIcon
                  name="i-lucide-check-circle-2"
                  :class="[
                    'h-5 w-5 shrink-0 mt-0.5',
                    plan.popular ? 'text-green-100' : 'text-green-500',
                  ]"
                />
                <span
                  :class="[
                    'text-sm leading-relaxed',
                    plan.popular
                      ? 'text-green-50'
                      : 'text-neutral-600 dark:text-neutral-300',
                  ]"
                >
                  {{ feature.body.static }}
                </span>
              </li>
            </ul>

            <UButton
              v-if="user"
              size="md"
              :class="[
                'w-full py-3 rounded-xl font-semibold text-sm text-center transition-all duration-200 inline-flex items-center justify-center',
                plan.popular
                  ? 'bg-white text-green-600 hover:bg-green-50 shadow-sm'
                  : 'bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200',
              ]"
              @click="navigateTo(`/app/billing/checkout?plan=${plan.id}`)"
            >
              {{ plan.cta }}
            </UButton>
            <UButton
              v-else
              :to="
                plan.id === 'enterprise'
                  ? `mailto:${config.public.SALES_EMAIL}`
                  : localePath('/register?plan=free')
              "
              :class="[
                'w-full py-3 rounded-xl font-semibold text-sm text-center transition-all duration-200 inline-flex items-center justify-center',
                plan.popular
                  ? 'bg-white text-green-600 hover:bg-green-50 shadow-sm'
                  : 'bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200',
              ]"
            >
              {{ plan.cta }}
            </UButton>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== CTA SECTION ====== -->
    <section class="py-20 lg:py-28 bg-muted">
      <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <div
          class="relative rounded-3xl bg-linear-to-br from-primary-400 via-primary-600 to-primary-800 p-12 lg:p-16 overflow-hidden shadow-xl"
        >
          <div class="relative z-10">
            <h2
              class="font-aeonik-pro-trial text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4"
            >
              {{ t("cta.title") }}
            </h2>
            <p class="text-lg mb-10 max-w-xl mx-auto text-white">
              {{ t("cta.subtitle") }}
            </p>
            <div
              class="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <UButton
                :to="localePath('/register?plan=free')"
                size="xl"
                class="bg-violet-500 hover:bg-violet-600 text-white shadow-xl shadow-violet-500/20 font-semibold px-10"
              >
                {{ t("cta.primary") }}
                <template #trailing>
                  <UIcon name="i-lucide-arrow-right" class="h-5 w-5" />
                </template>
              </UButton>
              <NuxtLink :to="localePath('/contact')">
                <UButton
                  size="xl"
                  variant="outline"
                  class="font-semibold px-10 bg-neutral-100 text-neutral-800"
                >
                  {{ t("cta.secondary") }}
                </UButton>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

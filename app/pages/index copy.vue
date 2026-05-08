<script setup lang="ts">
const route = useRoute();
definePageMeta({ layout: "default" });

const { data: settings } = usePublicSettings();

useSeoMeta({
  title: computed(
    () =>
      `${settings.value?.site_name ?? "Forge AI"} — All AI Models in One Platform`,
  ),
  description:
    "Chat, generate images, and create videos with the best AI models — Claude, GPT, Gemini, Grok, Deepseek, Kling, and more. It's free to try.",
  ogTitle: computed(
    () =>
      `${settings.value?.site_name ?? "Forge AI"} — All AI Models in One Platform`,
  ),
  ogDescription:
    "Chat, generate images, and create videos with the best AI models — Claude, GPT, Gemini, Grok, Deepseek, Kling, and more. It's free to try.",
  robots: "index, follow",
  ogImage: "/logo.png",
  ogUrl: route.fullPath,
  twitterCard: "summary_large_image",
  twitterTitle: computed(
    () =>
      `${settings.value?.site_name ?? "Forge AI"} — All AI Models in One Platform`,
  ),
  twitterDescription:
    "Chat, generate images, and create videos with the best AI models — Claude, GPT, Gemini, Grok, Deepseek, Kling, and more. It's free to try.",
  twitterImage: "/logo.png",
  twitterSite: "@forge_ai",
  twitterCreator: "@forge_ai",
});

const noiseStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
  backgroundRepeat: "repeat",
  backgroundSize: "128px 128px",
};

const gridStyle = {
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
  backgroundSize: "60px 60px",
};
</script>

<template>
  <div
    class="relative min-h-screen bg-white dark:bg-[#050508] text-neutral-900 dark:text-white overflow-x-hidden transition-colors duration-300"
  >
    <!-- Global background effects (dark mode only prominent, subtle in light) -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div
        class="absolute -top-60 -left-60 h-175 w-175 rounded-full bg-violet-500/5 dark:bg-violet-700/8 blur-[160px]"
      />
      <div
        class="absolute top-1/3 -right-40 h-125 w-125 rounded-full bg-indigo-500/5 dark:bg-indigo-600/6 blur-[140px]"
      />
      <div
        class="absolute bottom-0 left-1/4 h-100 w-100 rounded-full bg-cyan-500/5 dark:bg-cyan-600/5 blur-[120px]"
      />
      <div
        class="absolute inset-0 opacity-[0.008] dark:opacity-[0.015]"
        :style="noiseStyle"
      />
      <div
        class="absolute inset-0 opacity-[0.012] dark:opacity-[0.025]"
        :style="gridStyle"
      />
    </div>

    <LandingNav />
    <div
      v-if="settings?.is_maintenance"
      class="mx-auto mt-6 w-full max-w-6xl px-4"
    >
      <div
        class="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 dark:border-yellow-900/40 dark:bg-yellow-950/30 dark:text-yellow-200"
      >
        Maintenance mode is enabled. Some features may be unavailable.
      </div>
    </div>
    <main>
      <LandingHeroSection />
      <LandingProvidersSection />
      <LandingFeaturesSection />
      <LandingDemoSection />
      <LandingCapabilitiesSection />
      <LandingCtaSection />
    </main>
    <LandingFooter />
  </div>
</template>

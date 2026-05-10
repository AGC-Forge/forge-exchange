<script setup lang="ts">
const route = useRoute();
definePageMeta({ layout: "default" });

useSeoMeta({
  title: computed(() => `Forge Exchange — All AI Models in One Platform`),
  description:
    "Chat, generate images, and create videos with the best AI models — Claude, GPT, Gemini, Grok, Deepseek, Kling, and more. It's free to try.",
  ogTitle: computed(() => `Forge Exchange — All AI Models in One Platform`),
  ogDescription:
    "Chat, generate images, and create videos with the best AI models — Claude, GPT, Gemini, Grok, Deepseek, Kling, and more. It's free to try.",
  robots: "index, follow",
  ogImage: "/logo.png",
  ogUrl: route.fullPath,
  twitterCard: "summary_large_image",
  twitterTitle: computed(
    () => `Forge Exchange — All AI Models in One Platform`,
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
  <div>
    <UPageHero
      title="Nuxt Starter Template"
      description="A production-ready starter template powered by Nuxt UI. Build beautiful, accessible, and performant applications in minutes, not hours."
      :links="[
        {
          label: 'Get started',
          to: '/login',
          target: '',
          trailingIcon: 'i-lucide-arrow-right',
          size: 'xl',
        },
        {
          label: 'Use this template',
          to: 'https://github.com/nuxt-ui-templates/starter',
          target: '_blank',
          icon: 'i-simple-icons-github',
          size: 'xl',
          color: 'neutral',
          variant: 'subtle',
        },
      ]"
    />

    <UPageSection
      id="features"
      title="Everything you need to build modern Nuxt apps"
      description="Start with a solid foundation. This template includes all the essentials for building production-ready applications with Nuxt UI's powerful component system."
      :features="[
        {
          icon: 'i-lucide-rocket',
          title: 'Production-ready from day one',
          description:
            'Pre-configured with TypeScript, ESLint, Tailwind CSS, and all the best practices. Focus on building features, not setting up tooling.',
        },
        {
          icon: 'i-lucide-palette',
          title: 'Beautiful by default',
          description:
            'Leveraging Nuxt UI\'s design system with automatic dark mode, consistent spacing, and polished components that look great out of the box.',
        },
        {
          icon: 'i-lucide-zap',
          title: 'Lightning fast',
          description:
            'Optimized for performance with SSR/SSG support, automatic code splitting, and edge-ready deployment. Your users will love the speed.',
        },
        {
          icon: 'i-lucide-blocks',
          title: '100+ components included',
          description:
            'Access Nuxt UI\'s comprehensive component library. From forms to navigation, everything is accessible, responsive, and customizable.',
        },
        {
          icon: 'i-lucide-code-2',
          title: 'Developer experience first',
          description:
            'Auto-imports, hot module replacement, and TypeScript support. Write less boilerplate and ship more features.',
        },
        {
          icon: 'i-lucide-shield-check',
          title: 'Built for scale',
          description:
            'Enterprise-ready architecture with proper error handling, SEO optimization, and security best practices built-in.',
        },
      ]"
    />

    <UPageSection>
      <UPageCTA
        title="Ready to build your next Nuxt app?"
        description="Join thousands of developers building with Nuxt and Nuxt UI. Get this template and start shipping today."
        variant="subtle"
        :links="[
          {
            label: 'Start building',
            to: 'https://ui.nuxt.com/docs/getting-started/installation/nuxt',
            target: '_blank',
            trailingIcon: 'i-lucide-arrow-right',
            color: 'neutral',
          },
          {
            label: 'View on GitHub',
            to: 'https://github.com/nuxt-ui-templates/starter',
            target: '_blank',
            icon: 'i-simple-icons-github',
            color: 'neutral',
            variant: 'outline',
          },
        ]"
      />
    </UPageSection>
  </div>
</template>

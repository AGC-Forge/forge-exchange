<script setup lang="ts">
import * as locales from "@nuxt/ui/locale";

const { locale } = useI18n();
const config = useRuntimeConfig();
const router = useRouter();

const lang = computed(() => locales[locale.value].code);
const dir = computed(() => locales[locale.value].dir);

useHead({
  htmlAttrs: {
    lang,
    dir,
  },
});

const { proxy: gaOne } = useScriptGoogleAnalytics({
  id: "G-B7R83XWFT7",
});

router.afterEach((to, from) => {
  if (!to.path.includes("/app")) {
    useScriptEventPage(({ title, path }) => {
      gaOne.gtag("event", "page_view", {
        page_title: title,
        page_location: config.public.PUBLIC_SITE_URL,
        page_path: path,
      });
    });
  }
});
</script>

<template>
  <UApp :locale="locales[locale]">
    <NuxtLoadingIndicator />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: all 0.4s;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
  filter: blur(1rem);
}
</style>

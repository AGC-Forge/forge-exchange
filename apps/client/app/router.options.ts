import type { RouterConfig } from "@nuxt/schema";

export default <RouterConfig>{
  async scrollBehavior(to, from, savedPosition) {
    const nuxtApp = useNuxtApp()

    if (nuxtApp.$i18n && to.name !== from.name) {
      try {
        await nuxtApp.$i18n.waitForPendingLocaleChange();
      } catch (error) {
        console.warn('Failed to wait for locale change:', error);
      }
    }


    if (from.name === undefined) {
      return { top: 0, behavior: "smooth" };
    }

    if (to.hash) {

      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        el: to.hash,
        behavior: "smooth",
        top: 80, // offset untuk header fixed jika ada
      };
    }

    if (savedPosition) {
      return savedPosition;
    }

    return { top: 0, behavior: "smooth" };
  },
};

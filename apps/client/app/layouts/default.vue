<script setup lang="ts">
const { t, locales, setLocale } = useI18n();
const colorMode = useColorMode();
const locale = useLocalePath();
const switchLocalePath = useSwitchLocalePath();

const isMobileMenuOpen = ref(false);
const isScrolled = ref(false);

const navItems = computed(() => [
  { label: t("nav.home"), to: locale("/") },
  { label: t("nav.features"), to: locale("/#features") },
  { label: t("nav.docs"), to: locale("/docs") },
  { label: t("nav.faq"), to: locale("/faq") },
  { label: t("nav.pricing"), to: locale("/#pricing") },
  { label: t("nav.contact"), to: locale("/contact") },
]);

// Scroll detection
onMounted(() => {
  const handleScroll = () => {
    isScrolled.value = window.scrollY > 20;
  };
  window.addEventListener("scroll", handleScroll, { passive: true });
  onUnmounted(() => window.removeEventListener("scroll", handleScroll));
});

// Close mobile menu on route change
const route = useRoute();
watch(
  () => route.path,
  () => {
    isMobileMenuOpen.value = false;
  },
);

const currentYear = new Date().getFullYear();

const handleChangeLocale = async (locale: "en" | "id") => {
  setLocale(locale);
  await navigateTo(switchLocalePath(locale));
};
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header / Navbar -->
    <header
      :class="[
        'sticky top-0 z-50 w-full transition-all duration-300',
        isScrolled
          ? 'bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-200/50 dark:border-neutral-800/50 shadow-sm'
          : 'bg-transparent',
      ]"
    >
      <nav class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <!-- Logo -->
          <NuxtLink :to="locale('/')" class="flex items-center gap-2.5 group">
            <div
              class="relative flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/25 group-hover:shadow-green-500/40 transition-shadow duration-300"
            >
              <svg
                class="h-5 w-5 text-white"
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
            <span
              class="font-aeonik-pro-trial text-lg font-bold tracking-tight text-neutral-900 dark:text-white"
            >
              Forge Exchange
            </span>
          </NuxtLink>

          <!-- Desktop Nav -->
          <div class="hidden lg:flex items-center gap-1">
            <template v-for="item in navItems" :key="item.to">
              <NuxtLink
                :to="item.to"
                class="relative px-3.5 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-lg hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors duration-200"
              >
                {{ item.label }}
              </NuxtLink>
            </template>
          </div>

          <!-- Right Side -->
          <div class="flex items-center gap-2">
            <!-- Language Switcher -->
            <UDropdownMenu
              :items="[
                [
                  {
                    label: 'English',
                    icon: 'circle-flags:us',
                    click: () => handleChangeLocale('en'),
                  },
                  {
                    label: 'Bahasa Indonesia',
                    icon: 'circle-flags:id',
                    click: () => handleChangeLocale('id'),
                  },
                ],
              ]"
              :popper="{ placement: 'bottom-end', offsetDistance: 8 }"
            >
              <UButton
                variant="ghost"
                size="sm"
                :label="$i18n.locale === 'en' ? 'EN' : 'ID'"
                class="hidden sm:flex"
              />
              <UButton variant="ghost" size="sm" class="sm:hidden">
                <span class="text-sm">{{
                  $i18n.locale === "en" ? "🇬🇧" : "🇮🇩"
                }}</span>
              </UButton>
            </UDropdownMenu>

            <!-- Color Mode Toggle -->
            <UButton
              variant="ghost"
              size="sm"
              square
              @click="
                colorMode.preference =
                  colorMode.preference === 'dark' ? 'light' : 'dark'
              "
            >
              <UIcon
                :name="
                  colorMode.preference === 'dark'
                    ? 'i-lucide-sun'
                    : 'i-lucide-moon'
                "
                class="h-4 w-4"
              />
            </UButton>

            <!-- Auth Buttons -->
            <div class="hidden sm:flex items-center gap-2 ml-1">
              <NuxtLink :to="locale('/login')">
                <UButton variant="ghost" size="sm">
                  {{ t("auth.login") }}
                </UButton>
              </NuxtLink>
              <NuxtLink :to="locale('/register')">
                <UButton
                  size="sm"
                  class="bg-green-500 hover:bg-green-600 text-white shadow-sm shadow-green-500/20"
                >
                  {{ t("auth.register") }}
                </UButton>
              </NuxtLink>
            </div>

            <!-- Mobile Menu Toggle -->
            <UButton
              variant="ghost"
              size="sm"
              square
              class="lg:hidden"
              @click="isMobileMenuOpen = !isMobileMenuOpen"
            >
              <UIcon
                :name="isMobileMenuOpen ? 'i-lucide-x' : 'i-lucide-menu'"
                class="h-5 w-5"
              />
            </UButton>
          </div>
        </div>

        <!-- Mobile Menu -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div
            v-if="isMobileMenuOpen"
            class="lg:hidden pb-4 border-t border-neutral-200/50 dark:border-neutral-800/50 mt-2 pt-3"
          >
            <div class="flex flex-col gap-1">
              <NuxtLink
                v-for="item in navItems"
                :key="item.to"
                :to="item.to"
                class="px-3 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 rounded-lg hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
              >
                {{ item.label }}
              </NuxtLink>
              <div
                class="flex items-center gap-2 pt-3 mt-1 border-t border-neutral-200/50 dark:border-neutral-800/50"
              >
                <NuxtLink :to="locale('/login')" class="flex-1">
                  <UButton variant="outline" size="sm" block>
                    {{ t("auth.login") }}
                  </UButton>
                </NuxtLink>
                <NuxtLink :to="locale('/register')" class="flex-1">
                  <UButton
                    size="sm"
                    block
                    class="bg-green-500 hover:bg-green-600 text-white shadow-sm shadow-green-500/20"
                  >
                    {{ t("auth.register") }}
                  </UButton>
                </NuxtLink>
              </div>
            </div>
          </div>
        </Transition>
      </nav>
    </header>

    <!-- Page Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer
      class="border-t border-neutral-200/50 dark:border-neutral-800/50 bg-white dark:bg-neutral-950"
    >
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div class="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <!-- Brand -->
          <div class="col-span-2 md:col-span-4 lg:col-span-1">
            <NuxtLink :to="locale('/')" class="flex items-center gap-2.5 mb-4">
              <div
                class="relative flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/25"
              >
                <svg
                  class="h-5 w-5 text-white"
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
              <span
                class="font-aeonik-pro-trial text-lg font-bold tracking-tight text-neutral-900 dark:text-white"
              >
                Forge Exchange
              </span>
            </NuxtLink>
            <p
              class="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed"
            >
              {{ t("footer.tagline") }}
            </p>
          </div>

          <!-- Product -->
          <div>
            <h4
              class="text-sm font-semibold text-neutral-900 dark:text-white mb-4"
            >
              {{ t("footer.product.title") }}
            </h4>
            <ul class="space-y-2.5">
              <li>
                <NuxtLink
                  :to="locale('/#features')"
                  class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  {{ t("footer.product.features") }}
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  :to="locale('/#pricing')"
                  class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  {{ t("footer.product.pricing") }}
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  :to="locale('/changelog')"
                  class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  {{ t("footer.product.changelog") }}
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  :to="locale('/roadmap')"
                  class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  {{ t("footer.product.roadmap") }}
                </NuxtLink>
              </li>
            </ul>
          </div>

          <!-- Resources -->
          <div>
            <h4
              class="text-sm font-semibold text-neutral-900 dark:text-white mb-4"
            >
              {{ t("footer.resources.title") }}
            </h4>
            <ul class="space-y-2.5">
              <li>
                <NuxtLink
                  :to="locale('/docs')"
                  class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  {{ t("footer.resources.docs") }}
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  :to="locale('/docs')"
                  class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  {{ t("footer.resources.api") }}
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  :to="locale('/docs')"
                  class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  {{ t("footer.resources.tutorials") }}
                </NuxtLink>
              </li>
            </ul>
          </div>

          <!-- Company -->
          <div>
            <h4
              class="text-sm font-semibold text-neutral-900 dark:text-white mb-4"
            >
              {{ t("footer.company.title") }}
            </h4>
            <ul class="space-y-2.5">
              <li>
                <NuxtLink
                  :to="locale('/about')"
                  class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  {{ t("footer.company.about") }}
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  :to="locale('/contact')"
                  class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  {{ t("footer.company.contact") }}
                </NuxtLink>
              </li>
            </ul>
          </div>

          <!-- Legal -->
          <div>
            <h4
              class="text-sm font-semibold text-neutral-900 dark:text-white mb-4"
            >
              {{ t("footer.legal.title") }}
            </h4>
            <ul class="space-y-2.5">
              <li>
                <NuxtLink
                  :to="locale('/terms')"
                  class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  {{ t("footer.legal.terms") }}
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  :to="locale('/privacy')"
                  class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  {{ t("footer.legal.privacy") }}
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  :to="locale('/faq')"
                  class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  {{ t("footer.legal.faq") }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>

        <!-- Bottom bar -->
        <div
          class="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-200/50 dark:border-neutral-800/50 pt-8"
        >
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            {{ t("footer.copyright", { year: currentYear }) }}
          </p>
          <div class="flex items-center gap-4">
            <!-- Social links -->
            <a
              href="#"
              class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                />
              </svg>
            </a>
            <a
              href="#"
              class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                />
              </svg>
            </a>
            <a
              href="#"
              class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { t, messages } = useI18n()
const locale = useLocalePath()

useSeoMeta({
  title: 'Terms of Service — Forge Exchange',
  description: 'Forge Exchange Terms of Service. Read our terms and conditions for using our platform.',
})

const localeMessages = computed(() => messages.value as Record<string, any>)
const sections = computed(() => Object.values(localeMessages.value?.terms?.sections || {}) as any[])
</script>

<template>
  <div>
    <!-- Page Header -->
    <section class="bg-white dark:bg-neutral-950 border-b border-neutral-200/50 dark:border-neutral-800/50">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div class="max-w-3xl">
          <nav class="text-sm text-neutral-500 dark:text-neutral-400 mb-4 flex items-center gap-2">
            <NuxtLink :to="locale('/')" class="hover:text-green-600 dark:hover:text-green-400 transition-colors">Home</NuxtLink>
            <UIcon name="i-lucide-chevron-right" class="h-4 w-4" />
            <span class="text-neutral-900 dark:text-white">{{ t('terms.title') }}</span>
          </nav>
          <h1 class="font-aeonik-pro-trial text-4xl sm:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight mb-4">
            {{ t('terms.title') }}
          </h1>
          <p class="text-neutral-500 dark:text-neutral-400">{{ t('terms.lastUpdated') }}</p>
        </div>
      </div>
    </section>

    <!-- Content -->
    <section class="py-16 lg:py-24 bg-neutral-50 dark:bg-neutral-900/50">
      <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl p-8 lg:p-12">
          <div class="prose prose-neutral dark:prose-invert max-w-none">
            <div
              v-for="(section, index) in sections"
              :key="index"
              class="mb-10 last:mb-0"
            >
              <h2 class="text-xl font-semibold text-neutral-900 dark:text-white mb-4 flex items-start gap-3">
                <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-400 text-sm font-bold shrink-0 mt-0.5">
                  {{ index + 1 }}
                </span>
                {{ section.title }}
              </h2>
              <div class="pl-11 space-y-3">
                <p
                  v-for="(line, li) in section.content.split('\n')"
                  :key="li"
                  class="text-neutral-600 dark:text-neutral-300 leading-relaxed"
                >
                  {{ line }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom CTA -->
        <div class="mt-10 text-center p-8 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl">
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            Questions about our terms?
          </h3>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
            Our legal team is here to help.
          </p>
          <NuxtLink :to="locale('/contact')">
            <UButton class="bg-green-500 hover:bg-green-600 text-white shadow-sm shadow-green-500/20 font-semibold">
              Contact Us
            </UButton>
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
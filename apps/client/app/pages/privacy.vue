<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { t } = useI18n()
const locale = useLocalePath()

useSeoMeta({
  title: 'Privacy Policy — Forge Exchange',
  description: 'Forge Exchange Privacy Policy. Learn how we collect, use, and protect your data.',
})

const infoSections = computed(() => t('privacy.sections') as any)
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
            <span class="text-neutral-900 dark:text-white">{{ t('privacy.title') }}</span>
          </nav>
          <h1 class="font-aeonik-pro-trial text-4xl sm:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight mb-4">
            {{ t('privacy.title') }}
          </h1>
          <p class="text-neutral-500 dark:text-neutral-400">{{ t('privacy.lastUpdated') }}</p>
        </div>
      </div>
    </section>

    <!-- Content -->
    <section class="py-16 lg:py-24 bg-neutral-50 dark:bg-neutral-900/50">
      <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl p-8 lg:p-12">
          <!-- Intro -->
          <p class="text-neutral-600 dark:text-neutral-300 leading-relaxed mb-10 pb-8 border-b border-neutral-200/60 dark:border-neutral-800/60">
            {{ t('privacy.intro') }}
          </p>

          <!-- Information Collection -->
          <div class="mb-10">
            <h2 class="text-xl font-semibold text-neutral-900 dark:text-white mb-6 flex items-center gap-3">
              <UIcon name="i-lucide-database" class="h-6 w-6 text-green-500 shrink-0" />
              {{ infoSections.informationCollection.title }}
            </h2>
            <div class="space-y-6 pl-9">
              <div
                v-for="(item, key) in infoSections.informationCollection.items"
                :key="key"
                class="relative"
              >
                <h3 class="text-base font-medium text-neutral-800 dark:text-neutral-100 mb-2">
                  {{ item.title }}
                </h3>
                <p class="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  {{ item.description }}
                </p>
              </div>
            </div>
          </div>

          <!-- Other sections -->
          <div
            v-for="(section, key) in infoSections"
            :key="key"
            :class="[
              'mb-10 last:mb-0',
              ['informationCollection'].includes(key as string) ? '' : ''
            ]"
          >
            <template
              v-if="!['informationCollection'].includes(key as string) && section.title && typeof section.content === 'string'"
            >
              <h2 class="text-xl font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-3">
                <UIcon name="i-lucide-shield-check" class="h-6 w-6 text-green-500 shrink-0" />
                {{ section.title }}
              </h2>
              <div class="pl-9 space-y-3">
                <p
                  v-for="(line, li) in section.content.split('\n')"
                  :key="li"
                  class="text-neutral-600 dark:text-neutral-300 leading-relaxed"
                >
                  {{ line }}
                </p>
              </div>
            </template>
          </div>
        </div>

        <!-- Bottom CTA -->
        <div class="mt-10 text-center p-8 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl">
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            Privacy concerns?
          </h3>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
            Our Data Protection Officer is ready to help.
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
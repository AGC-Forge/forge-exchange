<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { t } = useI18n()
const locale = useLocalePath()

useSeoMeta({
  title: 'Contact Us — Forge Exchange',
  description: 'Get in touch with the Forge Exchange team. We respond within 24 hours.',
})

// Form state
const form = reactive({
  name: '',
  email: '',
  subject: '',
  message: '',
})

const formErrors = reactive({
  name: '',
  email: '',
  subject: '',
  message: '',
})

const isSubmitting = ref(false)
const isSubmitted = ref(false)

// Validation
const validateEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

const validate = () => {
  let valid = true
  formErrors.name = ''
  formErrors.email = ''
  formErrors.subject = ''
  formErrors.message = ''

  if (!form.name.trim()) {
    formErrors.name = t('contact.form.required')
    valid = false
  }
  if (!form.email.trim()) {
    formErrors.email = t('contact.form.required')
    valid = false
  } else if (!validateEmail(form.email)) {
    formErrors.email = t('contact.form.invalidEmail')
    valid = false
  }
  if (!form.subject.trim()) {
    formErrors.subject = t('contact.form.required')
    valid = false
  }
  if (!form.message.trim()) {
    formErrors.message = t('contact.form.required')
    valid = false
  }
  return valid
}

const handleSubmit = async () => {
  if (!validate()) return
  isSubmitting.value = true

  // Simulate API call (replace with real API later)
  await new Promise((resolve) => setTimeout(resolve, 1500))

  isSubmitting.value = false
  isSubmitted.value = true
  form.name = ''
  form.email = ''
  form.subject = ''
  form.message = ''
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <section class="relative bg-white dark:bg-neutral-950 border-b border-neutral-200/50 dark:border-neutral-800/50">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div class="text-center max-w-3xl mx-auto">
          <h1 class="font-aeonik-pro-trial text-4xl sm:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight mb-4">
            {{ t('contact.title') }}
          </h1>
          <p class="text-lg text-neutral-500 dark:text-neutral-400">
            {{ t('contact.subtitle') }}
          </p>
        </div>
      </div>
    </section>

    <!-- Contact Form + Info -->
    <section class="py-16 lg:py-24 bg-neutral-50 dark:bg-neutral-900/50">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <!-- Form -->
          <div class="lg:col-span-2">
            <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl p-8">
              <!-- Success State -->
              <div v-if="isSubmitted" class="text-center py-12">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                  <UIcon name="i-lucide-check-circle-2" class="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 class="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                  {{ t('contact.form.success') }}
                </h3>
                <UButton variant="outline" size="sm" class="mt-4" @click="isSubmitted = false">
                  Send another message
                </UButton>
              </div>

              <!-- Form -->
              <form v-else @submit.prevent="handleSubmit" class="space-y-6">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <!-- Name -->
                  <div>
                    <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
                      {{ t('contact.form.name') }}
                    </label>
                    <UInput
                      v-model="form.name"
                      :placeholder="t('contact.form.namePlaceholder')"
                      size="lg"
                      :error="!!formErrors.name"
                      class="w-full"
                    />
                    <p v-if="formErrors.name" class="mt-1.5 text-sm text-red-500">
                      {{ formErrors.name }}
                    </p>
                  </div>

                  <!-- Email -->
                  <div>
                    <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
                      {{ t('contact.form.email') }}
                    </label>
                    <UInput
                      v-model="form.email"
                      type="email"
                      :placeholder="t('contact.form.emailPlaceholder')"
                      size="lg"
                      :error="!!formErrors.email"
                      class="w-full"
                    />
                    <p v-if="formErrors.email" class="mt-1.5 text-sm text-red-500">
                      {{ formErrors.email }}
                    </p>
                  </div>
                </div>

                <!-- Subject -->
                <div>
                  <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
                    {{ t('contact.form.subject') }}
                  </label>
                  <UInput
                    v-model="form.subject"
                    :placeholder="t('contact.form.subjectPlaceholder')"
                    size="lg"
                    :error="!!formErrors.subject"
                    class="w-full"
                  />
                  <p v-if="formErrors.subject" class="mt-1.5 text-sm text-red-500">
                    {{ formErrors.subject }}
                  </p>
                </div>

                <!-- Message -->
                <div>
                  <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
                    {{ t('contact.form.message') }}
                  </label>
                  <UTextarea
                    v-model="form.message"
                    :rows="6"
                    :placeholder="t('contact.form.messagePlaceholder')"
                    size="lg"
                    :error="!!formErrors.message"
                    class="w-full"
                  />
                  <p v-if="formErrors.message" class="mt-1.5 text-sm text-red-500">
                    {{ formErrors.message }}
                  </p>
                </div>

                <!-- Submit -->
                <UButton
                  type="submit"
                  size="lg"
                  :loading="isSubmitting"
                  class="bg-green-500 hover:bg-green-600 text-white shadow-sm shadow-green-500/20 font-semibold px-8"
                >
                  {{ isSubmitting ? t('contact.form.sending') : t('contact.form.submit') }}
                  <template v-if="!isSubmitting" #trailing>
                    <UIcon name="i-lucide-send" class="h-4 w-4" />
                  </template>
                </UButton>
              </form>
            </div>
          </div>

          <!-- Info Sidebar -->
          <div class="space-y-6">
            <!-- Contact Info Card -->
            <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl p-7">
              <h3 class="text-lg font-semibold text-neutral-900 dark:text-white mb-5">
                {{ t('contact.info.title') }}
              </h3>

              <div class="space-y-5">
                <div class="flex items-start gap-4">
                  <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/50 shrink-0">
                    <UIcon name="i-lucide-mail" class="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-0.5">{{ t('contact.info.email') }}</p>
                    <p class="text-sm font-medium text-neutral-900 dark:text-white">{{ t('contact.info.emailValue') }}</p>
                  </div>
                </div>

                <div class="flex items-start gap-4">
                  <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/50 shrink-0">
                    <UIcon name="i-lucide-map-pin" class="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-0.5">{{ t('contact.info.location') }}</p>
                    <p class="text-sm font-medium text-neutral-900 dark:text-white">{{ t('contact.info.locationValue') }}</p>
                  </div>
                </div>

                <div class="flex items-start gap-4">
                  <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/50 shrink-0">
                    <UIcon name="i-lucide-clock" class="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-0.5">{{ t('contact.info.response') }}</p>
                    <p class="text-sm font-medium text-neutral-900 dark:text-white">{{ t('contact.info.responseValue') }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Social Links -->
            <div class="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl p-7">
              <h3 class="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                {{ t('contact.social.title') }}
              </h3>
              <div class="flex items-center gap-3">
                <a href="#" class="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400 transition-all duration-200">
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="#" class="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400 transition-all duration-200">
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
                <a href="#" class="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400 transition-all duration-200">
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
<script setup lang="ts">
export type SessionMode = "standard" | "premium";

export interface ModeOption {
  value: SessionMode;
  label: string;
  description: string;
  icon: string;
  creditCost: number | string;
  features: string[];
  color: string;
  recommended?: string;
}

const props = defineProps<{
  modelValue: SessionMode;
  connectedProviders: string[]; // providers yang sudah connected di Integrations
}>();

const emit = defineEmits<{
  "update:modelValue": [SessionMode];
}>();

const MODE_OPTIONS: ModeOption[] = [
  {
    value: "standard",
    label: "Standard Mode",
    description: "Built-in fingerprint engine berbasis Playwright stealth.",
    icon: "i-heroicons-shield-check",
    creditCost: 1,
    color: "indigo",
    features: [
      "Playwright stealth patches",
      "Canvas & WebGL noise",
      "Fingerprint randomizer",
      "Proxy injection",
      "Human behavior simulation",
    ],
  },
  {
    value: "premium",
    label: "Premium Mode",
    description:
      "Antidetect third-party browsers via CDP. More undetectable for high-level bot detection.",
    icon: "i-heroicons-rocket-launch",
    creditCost: "3–5",
    color: "purple",
    recommended: "Cloudflare / DataDome",
    features: [
      "Real antidetect browser profile",
      "Client Hints sync automatically",
      "Consistency OS + Browser + GPU",
      "WebRTC masking native",
      "More resistant to high-level bot detection",
    ],
  },
];

const selected = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const hasConnectedProviders = computed(
  () => props.connectedProviders.length > 0,
);
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button
        v-for="opt in MODE_OPTIONS"
        :key="opt.value"
        type="button"
        class="relative text-left border rounded-xl p-5 transition-all"
        :class="[
          selected === opt.value
            ? opt.color === 'purple'
              ? 'border-purple-500/50 bg-purple-500/8 shadow-[0_0_0_1px_rgba(168,85,247,0.2)]'
              : 'border-indigo-500/50 bg-indigo-500/8 shadow-[0_0_0_1px_rgba(99,102,241,0.2)]'
            : 'border-secondary/20 bg-secondary/5 hover:border-secondary/40',
          opt.value === 'premium' && !hasConnectedProviders
            ? 'opacity-60 cursor-not-allowed'
            : 'cursor-pointer',
        ]"
        :disabled="opt.value === 'premium' && !hasConnectedProviders"
        @click="
          opt.value === 'premium' && !hasConnectedProviders
            ? null
            : (selected = opt.value)
        "
      >
        <!-- Selected indicator -->
        <div
          v-if="selected === opt.value"
          class="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
          :class="opt.color === 'purple' ? 'bg-purple-500' : 'bg-indigo-500'"
        >
          <UIcon name="i-heroicons-check" class="w-3 h-3 text-white" />
        </div>

        <!-- Recommended badge -->
        <div
          v-if="opt.recommended && selected !== opt.value"
          class="absolute top-3 right-3"
        >
          <span
            class="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full"
          >
            For {{ opt.recommended }}
          </span>
        </div>

        <!-- Icon + Label -->
        <div class="flex items-center gap-3 mb-3">
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            :class="
              opt.color === 'purple' ? 'bg-purple-500/15' : 'bg-indigo-500/15'
            "
          >
            <UIcon
              :name="opt.icon"
              class="w-5 h-5"
              :class="
                opt.color === 'purple' ? 'text-purple-400' : 'text-indigo-400'
              "
            />
          </div>
          <div>
            <p class="font-semibold text-sm">{{ opt.label }}</p>
            <p class="text-xs text-muted">
              <span
                class="font-bold"
                :class="
                  opt.color === 'purple' ? 'text-purple-400' : 'text-indigo-400'
                "
              >
                {{ opt.creditCost }} credit
              </span>
              /session
            </p>
          </div>
        </div>

        <!-- Description -->
        <p class="text-xs text-muted mb-3">{{ opt.description }}</p>

        <!-- Features -->
        <ul class="space-y-1">
          <li
            v-for="feat in opt.features"
            :key="feat"
            class="flex items-center gap-1.5 text-xs text-muted"
          >
            <UIcon
              name="i-heroicons-check"
              class="w-3.5 h-3.5 shrink-0"
              :class="
                opt.color === 'purple' ? 'text-purple-400' : 'text-indigo-400'
              "
            />
            {{ feat }}
          </li>
        </ul>

        <!-- No provider warning -->
        <div
          v-if="opt.value === 'premium' && !hasConnectedProviders"
          class="mt-3 pt-3 border-t border-secondary/20 flex items-center gap-2"
        >
          <UIcon
            name="i-heroicons-exclamation-triangle"
            class="w-4 h-4 text-warning-400 shrink-0"
          />
          <p class="text-xs text-warning-400">
            No provider connected.
            <NuxtLink to="/app/integrations" class="underline font-medium">
              Setup in Integrations →
            </NuxtLink>
          </p>
        </div>
      </button>
    </div>
  </div>
</template>

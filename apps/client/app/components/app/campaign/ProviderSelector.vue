<script setup lang="ts">
export interface ProviderDef {
  value: string;
  label: string;
  description: string;
  icon: string;
  creditCost: number;
  bestFor: string;
  integration: string; // type di integration table
}

const props = defineProps<{
  modelValue: string; // selected provider
  connectedProviders: string[]; // ['gologin', 'adspower', ...]
}>();

const emit = defineEmits<{
  "update:modelValue": [string];
}>();

// ── Provider catalog ──────────────────────────────────────────
const ALL_PROVIDERS: ProviderDef[] = [
  {
    value: "gologin",
    label: "GoLogin",
    description: "Cloud-based antidetect browser with official Node.js SDK.",
    icon: "i-heroicons-globe-alt",
    creditCost: 4,
    bestFor: "General use, easy setup",
    integration: "gologin",
  },
  {
    value: "adspower",
    label: "AdsPower",
    description: "Local API di VPS. Stabil for automation at scale scale.",
    icon: "i-heroicons-computer-desktop",
    creditCost: 3,
    bestFor: "Large scale, affordable price",
    integration: "adspower",
  },
  {
    value: "multilogin",
    label: "Multilogin",
    description:
      "Platform antidetect paling mature. Best for high-security sites.",
    icon: "i-heroicons-shield-check",
    creditCost: 5,
    bestFor: "Cloudflare Enterprise, DataDome",
    integration: "multilogin",
  },
  {
    value: "dolphin",
    label: "Dolphin{anty}",
    description: "Local AppImage. Cost-effective with full features.",
    icon: "i-heroicons-finger-print",
    creditCost: 3,
    bestFor: "Budget premium, full features",
    integration: "dolphin",
  },
  {
    value: "nstbrowser",
    label: "Nstbrowser",
    description: "Built for automation. Support Docker, API v2 complete.",
    icon: "i-heroicons-server",
    creditCost: 4,
    bestFor: "Automation-first, Docker support",
    integration: "nstbrowser",
  },
];

// ── Filter hanya yang connected ───────────────────────────────
const connectedDefs = computed(() =>
  ALL_PROVIDERS.filter((p) => props.connectedProviders.includes(p.integration)),
);

const notConnectedDefs = computed(() =>
  ALL_PROVIDERS.filter(
    (p) => !props.connectedProviders.includes(p.integration),
  ),
);

const selected = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

// Auto-select first connected provider jika belum dipilih
onMounted(() => {
  if (!selected.value && connectedDefs.value.length > 0) {
    selected.value = connectedDefs.value[0]?.value || "";
  }
});
</script>

<template>
  <div class="space-y-4">
    <!-- Connected providers -->
    <div v-if="connectedDefs.length > 0" class="space-y-2">
      <label class="text-xs font-semibold text-muted uppercase tracking-wide">
        Available providers ({{ connectedDefs.length }})
      </label>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <button
          v-for="p in connectedDefs"
          :key="p.value"
          type="button"
          class="relative text-left border rounded-xl p-4 transition-all"
          :class="
            selected === p.value
              ? 'border-purple-500/50 bg-purple-500/8 shadow-[0_0_0_1px_rgba(168,85,247,0.2)]'
              : 'border-secondary/20 bg-secondary/5 hover:border-purple-500/30'
          "
          @click="selected = p.value"
        >
          <!-- Selected check -->
          <div
            v-if="selected === p.value"
            class="absolute top-3 right-3 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center"
          >
            <UIcon name="i-heroicons-check" class="w-3 h-3 text-white" />
          </div>

          <!-- Icon + name -->
          <div class="flex items-center gap-2.5 mb-2.5">
            <div
              class="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0"
            >
              <UIcon :name="p.icon" class="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p class="font-semibold text-sm">{{ p.label }}</p>
              <p class="text-xs text-purple-400 font-medium">
                {{ p.creditCost }} credit/session
              </p>
            </div>
          </div>

          <!-- Description -->
          <p class="text-xs text-muted mb-2">{{ p.description }}</p>

          <!-- Best for -->
          <div class="flex items-center gap-1.5">
            <UIcon
              name="i-heroicons-bolt"
              class="w-3 h-3 text-amber-400 shrink-0"
            />
            <span class="text-xs text-amber-400">{{ p.bestFor }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Not connected providers -->
    <div v-if="notConnectedDefs.length > 0" class="space-y-2">
      <label class="text-xs font-semibold text-muted uppercase tracking-wide">
        Other Providers (not connected yet)
      </label>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <div
          v-for="p in notConnectedDefs"
          :key="p.value"
          class="text-left border border-secondary/10 rounded-xl p-3 opacity-50"
        >
          <div class="flex items-center gap-2 mb-1.5">
            <UIcon :name="p.icon" class="w-4 h-4 text-muted" />
            <span class="text-sm font-medium text-muted">{{ p.label }}</span>
          </div>
          <p class="text-xs text-muted">{{ p.creditCost }} credit/session</p>
        </div>
      </div>

      <div class="flex items-center gap-2 pt-1">
        <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 text-primary" />
        <NuxtLink
          to="/app/integrations"
          class="text-sm text-primary hover:underline font-medium"
        >
          Setup providers in Integrations →
        </NuxtLink>
      </div>
    </div>

    <!-- No providers at all -->
    <div
      v-if="connectedDefs.length === 0"
      class="flex flex-col items-center py-8 text-center border border-dashed border-secondary/20 rounded-xl"
    >
      <UIcon
        name="material-symbols:power-plug"
        class="w-8 h-8 text-muted mb-2"
      />
      <p class="text-sm font-medium text-muted mb-1">
        No providers are connected
      </p>
      <p class="text-xs text-muted mb-3">
        Connect at least one antidetect browser in Integrations to use Premium
        Mode.
      </p>
      <UButton
        to="/app/integrations"
        icon="i-heroicons-plus"
        color="primary"
        variant="soft"
        size="sm"
      >
        Setup Integrations
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OsBrowserValue } from "./OsBrowserSelector.vue";

export interface PremiumModeConfig {
  sessionMode: "standard" | "premium";
  provider: string;
  os: string;
  osVersion: string;
  browserType: string;
  browserVersion: string;
}

const props = defineProps<{
  modelValue: PremiumModeConfig;
  hasGeoTargets: boolean;
  dailyLimit: number;
  currentBalance: number;
}>();

const emit = defineEmits<{
  "update:modelValue": [PremiumModeConfig];
}>();

// ── Fetch connected integrations ──────────────────────────────
const { data: integrationsData } = await useFetch("/api/integrations");

const connectedProviders = computed(() => {
  const ANTIDETECT_TYPES = [
    "gologin",
    "adspower",
    "multilogin",
    "dolphin",
    "nstbrowser",
  ];
  return (integrationsData.value?.data.integrations ?? [])
    .filter((i) => i.isActive && ANTIDETECT_TYPES.includes(i.type))
    .map((i: any) => i.type);
});

// ── Local state ───────────────────────────────────────────────
const local = reactive({ ...props.modelValue });
watch(
  () => props.modelValue,
  (v) => Object.assign(local, v),
  { deep: true },
);

function update(field: keyof PremiumModeConfig, value: any) {
  local[field] = value as never;
  emit("update:modelValue", { ...local });
}

function updateOsBrowser(v: OsBrowserValue) {
  Object.assign(local, v);
  emit("update:modelValue", { ...local });
}

function updateMode(mode: "standard" | "premium") {
  local.sessionMode = mode;
  // Reset provider ke yang pertama connected jika belum dipilih
  if (
    mode === "premium" &&
    !local.provider &&
    connectedProviders.value.length > 0
  ) {
    local.provider = connectedProviders.value[0];
  }
  emit("update:modelValue", { ...local });
}
</script>

<template>
  <div class="space-y-5">
    <!-- ── 1. Mode selector ─────────────────────────────────── -->
    <div>
      <label
        class="text-xs font-semibold text-muted uppercase tracking-wide block mb-3"
      >
        Session Mode
      </label>
      <AppCampaignSessionModeSelector
        :model-value="local.sessionMode"
        :connected-providers="connectedProviders"
        @update:model-value="updateMode"
      />
    </div>

    <!-- ── 2. Premium: Provider + OS/Browser ────────────────── -->
    <Transition name="fade-slide">
      <div v-if="local.sessionMode === 'premium'" class="space-y-5">
        <!-- Provider selector -->
        <div>
          <label
            class="text-xs font-semibold text-muted uppercase tracking-wide block mb-3"
          >
            Antidetect Provider
          </label>
          <AppCampaignProviderSelector
            :model-value="local.provider"
            :connected-providers="connectedProviders"
            @update:model-value="update('provider', $event)"
          />
        </div>

        <!-- OS + Browser selector -->
        <div
          class="bg-secondary/5 border border-secondary/15 rounded-xl p-5"
          :class="local.provider ? '' : 'opacity-50 pointer-events-none'"
        >
          <label
            class="text-xs font-semibold text-muted uppercase tracking-wide block mb-4"
          >
            OS & Browser Profile
          </label>
          <AppCampaignOsBrowserSelector
            :model-value="{
              os: local.os,
              osVersion: local.osVersion,
              browserType: local.browserType,
              browserVersion: local.browserVersion,
            }"
            @update:model-value="updateOsBrowser"
          />
        </div>
      </div>
    </Transition>

    <!-- ── 3. Credit estimator ──────────────────────────────── -->
    <AppCampaignCreditEstimator
      :session-mode="local.sessionMode"
      :provider="local.provider"
      :has-geo-targets="hasGeoTargets"
      :daily-limit="dailyLimit"
      :current-balance="currentBalance"
    />
  </div>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>

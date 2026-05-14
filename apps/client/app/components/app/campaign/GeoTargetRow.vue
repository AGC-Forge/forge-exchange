<script setup lang="ts">
interface ProxyPoolOption {
  id: string;
  name: string;
  type: string;
  country: string | null;
}

interface IntegrationOption {
  id: string;
  name: string;
  type: string;
}

const props = defineProps<{
  modelValue: GeoTargetInput;
  index: number;
  showWeight: boolean;
  proxyPools: ProxyPoolOption[];
  integrations: IntegrationOption[];
  countryOptions: { label: string; value: string }[];
}>();

const emit = defineEmits<{
  "update:modelValue": [GeoTargetInput];
  remove: [];
}>();

const local = computed(() => ({ ...props.modelValue }));

function update(field: keyof GeoTargetInput, value: any) {
  emit("update:modelValue", { ...local.value, [field]: value });
}

// Reset proxy fields saat source berubah
function onSourceChange(source: "pool" | "integration" | "none") {
  emit("update:modelValue", {
    ...local.value,
    proxySource: source,
    proxyPoolId: null,
    integrationId: null,
  });
}

// Proxy source options
const proxySourceOptions = [
  { label: "Tanpa Proxy", value: "none", icon: "i-heroicons-x-circle" },
  { label: "Proxy Pool", value: "pool", icon: "i-heroicons-server-stack" },
  {
    label: "Integration",
    value: "integration",
    icon: "material-symbols:power-plug",
  },
];

// Filter proxyPools yang cocok dengan country (atau semua jika tidak ada match)
const filteredPools = computed(() => {
  const countryPools = props.proxyPools.filter(
    (p) => p.country?.toLowerCase() === local.value.country?.toLowerCase(),
  );
  return countryPools.length > 0 ? countryPools : props.proxyPools;
});

// Proxy integration options (hanya yang kategori proxy)
const PROXY_INTEGRATION_TYPES = [
  "brightdata",
  "oxylabs",
  "iproyal",
  "smartproxy",
  "mobile_proxy",
  "socks5_proxy",
  "rotating_proxy",
  "residential_proxy",
];
const filteredIntegrations = computed(() =>
  props.integrations.filter((i) => PROXY_INTEGRATION_TYPES.includes(i.type)),
);

const poolOptions = computed(() =>
  filteredPools.value.map((p) => ({
    label: `${p.name} (${p.type}${p.country ? " · " + p.country : ""})`,
    value: p.id,
  })),
);

const integrationOptions = computed(() =>
  filteredIntegrations.value.map((i) => ({
    label: `${i.name} (${i.type})`,
    value: i.id,
  })),
);

const sourceColor = computed(
  () =>
    ({
      none: "neutral",
      pool: "indigo",
      integration: "emerald",
    })[local.value.proxySource] ?? "neutral",
);

const sourceLabel = computed(
  () =>
    ({
      none: "No Proxy",
      pool: "Proxy Pool",
      integration: "Integration",
    })[local.value.proxySource] ?? "—",
);
</script>

<template>
  <div
    class="border border-secondary/20 rounded-xl bg-secondary/5 p-4 space-y-3"
  >
    <!-- Row 1: Country + Weight + Remove -->
    <div class="flex items-center gap-2">
      <!-- Country selector -->
      <USelect
        :model-value="local.country"
        :items="countryOptions"
        placeholder="Pilih negara"
        size="sm"
        class="flex-1"
        @update:model-value="update('country', $event)"
      />

      <!-- Weight input (hanya untuk weighted mode) -->
      <div v-if="showWeight" class="flex items-center gap-1 shrink-0">
        <UInput
          :model-value="local.weight"
          type="number"
          :min="1"
          :max="100"
          placeholder="100"
          size="sm"
          class="w-20"
          @update:model-value="update('weight', Number($event))"
        />
        <span class="text-xs text-muted">%</span>
      </div>

      <!-- Remove button -->
      <UButton
        icon="i-heroicons-x-mark"
        color="neutral"
        variant="ghost"
        size="sm"
        class="shrink-0"
        @click="emit('remove')"
      />
    </div>

    <!-- Row 2: Proxy Source Selector -->
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted shrink-0">Proxy:</span>
        <div class="flex items-center gap-1">
          <UButton
            v-for="opt in proxySourceOptions"
            :key="opt.value"
            size="xs"
            :variant="local.proxySource === opt.value ? 'solid' : 'soft'"
            :color="
              local.proxySource === opt.value ? (sourceColor as any) : 'neutral'
            "
            :icon="opt.icon"
            @click="onSourceChange(opt.value as any)"
          >
            {{ opt.label }}
          </UButton>
        </div>
      </div>

      <!-- Source A: ProxyPool dropdown -->
      <Transition name="fade-slide">
        <div v-if="local.proxySource === 'pool'">
          <USelect
            :model-value="local.proxyPoolId ?? undefined"
            :items="poolOptions"
            placeholder="Pilih Proxy Pool"
            size="sm"
            class="w-full"
            :empty-label="
              filteredPools.length === 0
                ? 'Belum ada proxy pool — tambah di menu Proxy'
                : undefined
            "
            @update:model-value="update('proxyPoolId', $event)"
          />
          <p
            v-if="filteredPools.length === 0"
            class="text-xs text-amber-400 mt-1 flex items-center gap-1"
          >
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="w-3.5 h-3.5"
            />
            There is no proxy pool yet.
            <ULink to="/app/proxy" class="underline">Add Proxy Pool</ULink>
          </p>
          <p
            v-else-if="filteredPools.length > 0 && local.country"
            class="text-xs text-muted mt-1"
          >
            {{ filteredPools.length }} pool available
            {{
              props.proxyPools.filter(
                (p) => p.country?.toLowerCase() === local.country.toLowerCase(),
              ).length > 0
                ? "(filtered by country)"
                : "(all countries)"
            }}
          </p>
        </div>
      </Transition>

      <!-- Source B: Integration dropdown -->
      <Transition name="fade-slide">
        <div v-if="local.proxySource === 'integration'">
          <USelect
            :model-value="local.integrationId ?? undefined"
            :items="integrationOptions"
            placeholder="Pilih Provider Proxy"
            size="sm"
            class="w-full"
            @update:model-value="update('integrationId', $event)"
          />
          <p
            v-if="filteredIntegrations.length === 0"
            class="text-xs text-amber-400 mt-1 flex items-center gap-1"
          >
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="w-3.5 h-3.5"
            />
            There is no active proxy integration.
            <ULink to="/app/integrations" class="underline">
              Setup Integrations
            </ULink>
          </p>
          <p v-else class="text-xs text-muted mt-1">
            Credentials are automatically retrieved from the selected
            integration. The country code will be injected into the provider's
            username.
          </p>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>

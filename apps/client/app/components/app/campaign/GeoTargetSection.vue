<script setup lang="ts">
const props = defineProps<{
  modelValue: GeoTargetInput[];
  geoMode: "single" | "multiple" | "weighted" | "dynamic";
}>();

const emit = defineEmits<{
  "update:modelValue": [GeoTargetInput[]];
}>();

const { data: poolsData } = await useFetch("/api/proxy-pools", {
  query: { limit: 200, status: "active" },
  default: () => ({
    data: { pools: [], byCountry: {}, total: 0, countries: [] },
  }),
});
const proxyPools = computed(() =>
  (poolsData.value?.data?.pools ?? []).map((p: any) => ({
    id: p.id,
    name: p.name ?? `${p.host}:${p.port}`,
    type: p.type,
    country: p.country,
  })),
);

// ── Fetch integrations kategori proxy ─────────────────────────
const { data: intgData } = await useFetch("/api/integrations", {
  query: { limit: 100, status: "active" },
  default: () => ({ data: { integrations: [] } }),
});
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
const integrations = computed(() =>
  (intgData.value?.data?.integrations ?? [])
    .filter((i: any) => PROXY_INTEGRATION_TYPES.includes(i.type) && i.isActive)
    .map((i: any) => ({ id: i.id, name: i.name, type: i.type })),
);

const { data: countries } = await useFetch("/api/geo/countries", {
  default: () => ({ data: [] as CountryItem[] }),
});
const countryOptions = computed(() =>
  (countries.value.data ?? []).map((c) => ({
    label: `${c.emoji ?? ""} ${c.name}`.trim(),
    value: c.code,
  })),
);

// ── Computed local list ───────────────────────────────────────
const local = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const showWeight = computed(() => props.geoMode === "weighted");
const isSingle = computed(() => props.geoMode === "single");
const isDynamic = computed(() => props.geoMode === "dynamic");
const canAddMore = computed(() => {
  if (isDynamic.value) return false;
  if (isSingle.value) return local.value.length < 1;
  return local.value.length < 20;
});

watch(
  () => props.geoMode,
  (mode) => {
    if (mode === "single" && local.value.length > 1) {
      local.value = [local.value[0]!];
    }
    // Reset weight ke 100 saat keluar dari weighted mode
    if (mode !== "weighted") {
      local.value = local.value.map((g) => ({ ...g, weight: 100 }));
    }
  },
);

// ── Add / update / remove ─────────────────────────────────────
function addRow() {
  if (!canAddMore.value) return;
  local.value = [
    ...local.value,
    {
      country: "",
      weight: 100,
      proxySource: "none",
      proxyPoolId: null,
      integrationId: null,
    },
  ];
}
function updateRow(i: number, val: GeoTargetInput) {
  const updated = [...local.value];
  updated[i] = val;
  local.value = updated;
}
function removeRow(i: number) {
  local.value = local.value.filter((_, idx) => idx !== i);
}

// ── Summary info ──────────────────────────────────────────────
const proxyCount = computed(
  () => local.value.filter((g) => g.proxySource !== "none").length,
);
const totalWeight = computed(() =>
  local.value.reduce((s, g) => s + (g.weight ?? 0), 0),
);
const isWeightOk = computed(
  () => !showWeight.value || totalWeight.value === 100,
);
</script>

<template>
  <div class="space-y-3">
    <!-- Summary badges -->
    <div v-if="!isDynamic" class="flex items-center gap-2 flex-wrap">
      <UBadge v-if="local.length > 0" color="neutral" variant="soft" size="xs">
        {{ local.length }} {{ isSingle ? "country" : "countries" }}
      </UBadge>
      <UBadge
        v-if="proxyCount > 0"
        variant="soft"
        size="xs"
        class="bg-indigo-500 dark:bg-indigo-400 text-white"
      >
        {{ proxyCount }} with proxy
      </UBadge>
      <UBadge
        v-if="showWeight && local.length > 0"
        :color="isWeightOk ? 'success' : 'warning'"
        variant="soft"
        size="xs"
      >
        Total: {{ totalWeight }}% {{ isWeightOk ? "✓" : "← harus 100%" }}
      </UBadge>
    </div>

    <!-- GeoTarget rows -->
    <div v-if="geoMode !== 'dynamic'" class="space-y-2">
      <AppCampaignGeoTargetRow
        v-for="(target, i) in local"
        :key="i"
        :model-value="target"
        :index="i"
        :show-weight="showWeight"
        :proxy-pools="proxyPools"
        :integrations="integrations"
        :country-options="countryOptions"
        @update:model-value="updateRow(i, $event)"
        @remove="removeRow(i)"
      />

      <!-- Empty state -->
      <div
        v-if="local.length === 0"
        class="text-xs text-muted text-center py-4 border border-dashed border-secondary/20 rounded-lg"
      >
        {{
          isSingle
            ? "Select 1 target country"
            : "Click the button below to add target countries"
        }}
      </div>

      <UButton
        v-if="local.length < 20"
        icon="i-heroicons-plus"
        variant="soft"
        color="neutral"
        size="sm"
        @click="addRow"
      >
        {{ isSingle ? "Select Country" : "Add Country" }}
      </UButton>

      <p v-if="isSingle && local.length >= 1" class="text-xs text-muted">
        Single Mode — only one target country. Switch to Multiple or Weighted
        for more than one.
      </p>
    </div>

    <!-- Weight helper untuk weighted mode -->
    <div
      v-if="showWeight && local.length > 1"
      class="p-3 rounded-lg bg-secondary/5 border border-secondary/20 text-xs text-muted space-y-1"
    >
      <p class="font-medium text-default">💡 How to use Weighted</p>
      <p>Total weight must = 100%. Example: 3 countries with 50%, 30%, 20%.</p>
      <p>Worker will distribute session proportionally per country.</p>
    </div>

    <!-- Legend -->
    <div
      v-if="local.length > 0"
      class="flex items-center gap-4 text-xs text-muted flex-wrap"
    >
      <span class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-neutral-400 inline-block" />No
        Proxy
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-indigo-500 inline-block" />Proxy
        Pool
        <span class="opacity-60">({{ proxyPools.length }} available)</span>
      </span>
      <span class="flex items-center gap-1.5">
        <span
          class="w-2 h-2 rounded-full bg-emerald-500 inline-block"
        />Integration Proxy
        <span class="opacity-60">({{ integrations.length }} active)</span>
      </span>
    </div>
    <!-- Dynamic mode info -->
    <div
      v-else
      class="flex items-start gap-2 p-3 bg-secondary/10 rounded-lg border border-secondary/20"
    >
      <UIcon
        name="i-heroicons-information-circle"
        class="w-4 h-4 shrink-0 mt-0.5 text-primary"
      />
      <div class="text-sm text-muted space-y-1">
        <p class="text-default font-medium">Dynamic Mode active</p>
        <p>
          The country is automatically selected based on the country of the
          active proxy pool. No manual setting is required.
        </p>
        <p
          v-if="proxyPools.length === 0"
          class="text-amber-400 flex items-center gap-1"
        >
          <UIcon name="i-heroicons-exclamation-triangle" class="w-3.5 h-3.5" />
          No active proxy pool available.
          <ULink to="/app/proxies" class="underline">
            Add proxy pool first.
          </ULink>
        </p>
      </div>
    </div>
  </div>
</template>

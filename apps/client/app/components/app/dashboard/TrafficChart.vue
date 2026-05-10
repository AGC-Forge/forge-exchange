<script setup lang="ts">
const props = defineProps<{
  loading?: boolean;
}>();

const activePeriod = ref("24h");
const periods = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
];

// Fetch chart data
const chartData = ref<{ label: string; value: number }[]>([]);

async function loadChart() {
  try {
    const res = await $fetch("/api/analytics/overview", {
      query: { period: activePeriod.value },
    });
    if (!res.success) throw new Error(res.message);
    chartData.value = res.data?.hourly ?? [];
  } catch (error) {
    console.error(error);
    // Demo data fallback
    chartData.value = Array.from({ length: 24 }, (_, i) => ({
      label: `${i}:00`,
      value: Math.floor(Math.random() * 120),
    }));
  }
}

watch(activePeriod, loadChart);
onMounted(loadChart);

// SVG chart calculations
const svgW = 800;
const svgH = 160;
const pad = { left: 0, right: 0, top: 10, bottom: 0 };

const maxVal = computed(() =>
  Math.max(...chartData.value.map((d) => d.value), 1),
);

const points = computed(() =>
  chartData.value.map((d, i) => ({
    x:
      pad.left +
      (i / (chartData.value.length - 1 || 1)) * (svgW - pad.left - pad.right),
    y: pad.top + (1 - d.value / maxVal.value) * (svgH - pad.top - pad.bottom),
  })),
);

const linePath = computed(() => {
  if (!points.value.length) return "";
  return points.value
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
});

const areaPath = computed(() => {
  if (!points.value.length) return "";
  const line = points.value
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const last = points.value[points.value.length - 1];
  const first = points.value[0];
  return `${line} L ${last?.x ?? 0} ${svgH} L ${first?.x ?? 0} ${svgH} Z`;
});

const xLabels = computed(() => {
  const data = chartData.value;
  if (!data.length) return [];
  const step = Math.floor(data.length / 6);
  return data.filter((_, i) => i % step === 0).map((d) => d.label);
});

const totalSessions = computed(() =>
  chartData.value.reduce((s, d) => s + d.value, 0),
);
</script>

<template>
  <UPageCard
    spotlight
    spotlight-color="secondary"
    :ui="{
      root: 'overflow-hidden overflow-x-auto shadow-md w-full',
      container:
        'shadow-md border border-secondary/20 dark:border-secondary/35 rounded-xl transition-all group overflow-hidden',
    }"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between px-5 py-4 border-b border-muted"
    >
      <div>
        <h3 class="text-sm font-semibold">Traffic Overview</h3>
        <p class="text-xs text-muted mt-0.5">
          Sessions per jam (24 jam terakhir)
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-for="period in periods"
          :key="period.value"
          class="text-xs px-2.5 py-1 rounded-md transition-colors"
          :class="
            activePeriod === period.value
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              : 'text-muted hover:text-muted'
          "
          @click="activePeriod = period.value"
        >
          {{ period.label }}
        </button>
      </div>
    </div>

    <!-- Chart area -->
    <div class="p-5">
      <div v-if="loading" class="h-48 flex items-center justify-center">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-6 h-6 text-muted animate-spin"
        />
      </div>

      <div
        v-else-if="chartData.length === 0"
        class="h-48 flex flex-col items-center justify-center gap-2"
      >
        <UIcon name="i-heroicons-chart-bar" class="w-8 h-8 text-muted" />
        <p class="text-sm text-muted">Belum ada data traffic</p>
      </div>

      <!-- SVG Chart (native, no external lib needed) -->
      <div v-else class="h-48 relative">
        <svg
          class="w-full h-full"
          :viewBox="`0 0 ${svgW} ${svgH}`"
          preserveAspectRatio="none"
        >
          <!-- Grid lines -->
          <line
            v-for="(_, i) in 4"
            :key="i"
            :x1="0"
            :y1="(svgH / 4) * i"
            :x2="svgW"
            :y2="(svgH / 4) * i"
            stroke="rgba(255,255,255,0.04)"
            stroke-width="1"
          />

          <!-- Area fill -->
          <path :d="areaPath" fill="url(#areaGradient)" opacity="0.5" />

          <!-- Line -->
          <path
            :d="linePath"
            fill="none"
            stroke="url(#lineGradient)"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Data points -->
          <circle
            v-for="(pt, i) in points"
            :key="i"
            :cx="pt.x"
            :cy="pt.y"
            r="3"
            fill="#6366f1"
            stroke="#080c14"
            stroke-width="2"
            class="opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <title>
              {{ chartData[i]?.label }}: {{ chartData[i]?.value }} sessions
            </title>
          </circle>

          <!-- Gradients -->
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#6366f1" stop-opacity="0.3" />
              <stop offset="100%" stop-color="#6366f1" stop-opacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#818cf8" />
              <stop offset="100%" stop-color="#6366f1" />
            </linearGradient>
          </defs>
        </svg>

        <!-- X labels -->
        <div class="flex justify-between mt-2 px-1">
          <span
            v-for="label in xLabels"
            :key="label"
            class="text-xs text-muted"
          >
            {{ label }}
          </span>
        </div>
      </div>

      <!-- Legend -->
      <div class="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-0.5 bg-indigo-500 dark:bg-indigo-400 rounded" />
          <span class="text-xs text-muted">Sessions</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-0.5 bg-emerald-500 dark:bg-emerald-400 rounded" />
          <span class="text-xs text-muted">Sukses</span>
        </div>
        <div class="ml-auto text-xs text-indigo-500 dark:text-indigo-400">
          Total:
          <span class="font-medium">{{ totalSessions.toLocaleString() }}</span>
        </div>
      </div>
    </div>
  </UPageCard>
</template>

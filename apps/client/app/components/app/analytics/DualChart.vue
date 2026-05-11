<script setup lang="ts">
const props = defineProps<{
  data: { date: string; total: number; success: number }[];
  loading?: boolean;
}>();

const W = 800;
const H = 140;

const maxVal = computed(() => Math.max(...props.data.map((d) => d.total), 1));
const grandTotal = computed(() => props.data.reduce((s, d) => s + d.total, 0));

function toPoints(values: number[]) {
  return values.map((v, i) => ({
    x: (i / Math.max(values.length - 1, 1)) * W,
    y: 8 + (1 - v / maxVal.value) * (H - 16),
  }));
}

const totalPoints = computed(() => toPoints(props.data.map((d) => d.total)));
const successPoints = computed(() =>
  toPoints(props.data.map((d) => d.success)),
);

function linePath(pts: { x: number; y: number }[]) {
  return pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

function areaPath(pts: { x: number; y: number }[]) {
  if (!pts || !pts.length) return "";
  const last = pts[pts.length - 1];
  const first = pts[0];
  return `${linePath(pts)} L ${last?.x ?? 0} ${H} L ${first?.x ?? 0} ${H} Z`;
}

const totalLinePath = computed(() => linePath(totalPoints.value));
const totalAreaPath = computed(() => areaPath(totalPoints.value));
const successLinePath = computed(() => linePath(successPoints.value));
const successAreaPath = computed(() => areaPath(successPoints.value));

const xLabels = computed(() => {
  if (!props.data.length) return [];
  const step = Math.max(1, Math.floor(props.data.length / 5));
  return props.data
    .filter((_, i) => i % step === 0)
    .map((d) => {
      const date = new Date(d.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });
});
</script>

<template>
  <div>
    <div v-if="loading" class="h-40 flex items-center justify-center">
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-6 h-6 text-muted animate-spin"
      />
    </div>

    <div
      v-else-if="!data.length"
      class="h-40 flex flex-col items-center justify-center gap-2"
    >
      <UIcon name="i-heroicons-chart-bar" class="w-8 h-8 text-muted" />
      <p class="text-sm text-muted">No data yet</p>
    </div>

    <div v-else>
      <div class="relative h-40">
        <svg
          class="w-full h-full"
          :viewBox="`0 0 ${W} ${H}`"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="total-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#6366f1" stop-opacity="0.2" />
              <stop offset="100%" stop-color="#6366f1" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="success-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#10b981" stop-opacity="0.2" />
              <stop offset="100%" stop-color="#10b981" stop-opacity="0" />
            </linearGradient>
          </defs>

          <!-- Grid -->
          <line
            v-for="i in 4"
            :key="i"
            x1="0"
            :y1="(H / 4) * (i - 1)"
            :x2="W"
            :y2="(H / 4) * (i - 1)"
            stroke="rgba(255,255,255,0.04)"
            stroke-width="1"
          />

          <!-- Total area + line -->
          <path :d="totalAreaPath" fill="url(#total-grad)" />
          <path
            :d="totalLinePath"
            fill="none"
            stroke="#6366f1"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Success area + line -->
          <path :d="successAreaPath" fill="url(#success-grad)" />
          <path
            :d="successLinePath"
            fill="none"
            stroke="#10b981"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-dasharray="4 2"
          />
        </svg>
      </div>

      <!-- X labels -->
      <div class="flex justify-between mt-2 px-0.5">
        <span
          v-for="lbl in xLabels"
          :key="lbl"
          class="text-xs text-slate-600"
          >{{ lbl }}</span
        >
      </div>

      <!-- Legend -->
      <div class="flex items-center gap-4 mt-3 pt-3 border-t border-muted">
        <div class="flex items-center gap-1.5">
          <span
            class="w-3 h-0.5 bg-indigo-500 dark:bg-indigo-400 rounded block"
          />
          <span class="text-xs text-muted">Total</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span
            class="w-3 h-0.5 bg-emerald-500 dark:bg-emerald-400 rounded block"
            style="border-top: 2px dashed #10b981; height: 0"
          />
          <span class="text-xs text-muted">Success</span>
        </div>
        <div class="ml-auto text-xs text-muted">
          Total:
          <span class="text-muted font-medium">{{
            grandTotal.toLocaleString()
          }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

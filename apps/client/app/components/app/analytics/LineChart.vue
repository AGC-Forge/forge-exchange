<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    data: { label: string; value: number }[];
    color?: string;
    label?: string;
    loading?: boolean;
  }>(),
  {
    color: "#6366f1",
    label: "Sessions",
  },
);

const uid = Math.random().toString(36).slice(2, 7);
const W = 800;
const H = 140;
const PAD = { top: 8, bottom: 0 };

const maxVal = computed(() => Math.max(...props.data.map((d) => d.value), 1));
const minVal = computed(() => Math.min(...props.data.map((d) => d.value)));
const totalVal = computed(() => props.data.reduce((s, d) => s + d.value, 0));

const points = computed(() =>
  props.data.map((d, i) => ({
    x: (i / Math.max(props.data.length - 1, 1)) * W,
    y: PAD.top + (1 - d.value / maxVal.value) * (H - PAD.top - PAD.bottom),
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
  const last = points.value[points.value.length - 1];
  const first = points.value[0];
  return `${linePath.value} L ${last?.x || 0} ${H} L ${first?.x || 0} ${H} Z`;
});

const xLabels = computed(() => {
  if (!props.data.length) return [];
  const step = Math.max(1, Math.floor(props.data.length / 6));
  return props.data.filter((_, i) => i % step === 0).map((d) => d.label);
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
      <!-- SVG chart -->
      <div class="relative h-40">
        <svg
          class="w-full h-full"
          :viewBox="`0 0 ${W} ${H}`"
          preserveAspectRatio="none"
        >
          <!-- Grid lines -->
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

          <!-- Area fill -->
          <defs>
            <linearGradient :id="`area-${uid}`" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" :stop-color="color" stop-opacity="0.25" />
              <stop offset="100%" :stop-color="color" stop-opacity="0.0" />
            </linearGradient>
          </defs>
          <path :d="areaPath" :fill="`url(#area-${uid})`" />

          <!-- Line -->
          <path
            :d="linePath"
            fill="none"
            :stroke="color"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Data point dots (visible on hover via parent) -->
          <circle
            v-for="(pt, i) in points"
            :key="i"
            :cx="pt.x"
            :cy="pt.y"
            r="3"
            :fill="color"
            stroke="#080c14"
            stroke-width="2"
            class="opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <title>
              {{ data[i]?.label }}: {{ data[i]?.value.toLocaleString() }}
              {{ label }}
            </title>
          </circle>
        </svg>
      </div>

      <!-- X labels -->
      <div class="flex justify-between mt-2 px-0.5">
        <span v-for="lbl in xLabels" :key="lbl" class="text-xs text-muted">{{
          lbl
        }}</span>
      </div>

      <!-- Stats row -->
      <div
        class="flex items-center justify-between mt-3 pt-3 border-t border-muted"
      >
        <div class="flex items-center gap-2">
          <span
            class="w-3 h-0.5 rounded block"
            :style="{ background: color }"
          />
          <span class="text-xs text-muted">{{ label }}</span>
        </div>
        <div class="flex items-center gap-4 text-xs text-muted">
          <span
            >Min:
            <span class="text-muted">{{ minVal.toLocaleString() }}</span></span
          >
          <span
            >Max:
            <span class="text-muted">{{ maxVal.toLocaleString() }}</span></span
          >
          <span
            >Total:
            <span class="text-muted">{{
              totalVal.toLocaleString()
            }}</span></span
          >
        </div>
      </div>
    </div>
  </div>
</template>

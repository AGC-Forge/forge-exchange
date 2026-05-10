<script setup lang="ts">
defineProps<{
  geoData: Array<{ country: string; count: number; pct: number }>;
  loading?: boolean;
}>();

const barColors = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];

function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(c.charCodeAt(0) + 127397));
}
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
        <h3 class="text-sm font-semibold">GEO Distribution</h3>
        <p class="text-xs text-muted mt-0.5">Traffic by country</p>
      </div>
    </div>

    <div class="p-5">
      <div v-if="loading" class="space-y-3">
        <div
          v-for="i in 5"
          :key="i"
          class="h-8 bg-white/3 rounded-lg animate-pulse"
        />
      </div>

      <div v-else-if="!geoData.length" class="text-center py-6">
        <UIcon
          name="i-heroicons-globe-alt"
          class="w-8 h-8 text-muted mx-auto mb-2"
        />
        <p class="text-sm text-muted">No GEO data yet</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(item, i) in geoData"
          :key="item.country"
          class="flex items-center gap-3"
        >
          <!-- Rank -->
          <span class="text-xs text-muted w-4 text-right shrink-0">{{
            i + 1
          }}</span>

          <!-- Flag + country -->
          <div class="flex items-center gap-1.5 w-24 shrink-0">
            <span class="text-base leading-none">{{
              countryFlag(item.country)
            }}</span>
            <span class="text-xs text-muted font-medium">{{
              item.country
            }}</span>
          </div>

          <!-- Progress bar -->
          <div class="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700"
              :style="{
                width: `${item.pct}%`,
                background: barColors[i % barColors.length],
              }"
            />
          </div>

          <!-- Count -->
          <span
            class="text-xs text-muted tabular-nums w-14 text-right shrink-0"
          >
            {{ item.count.toLocaleString() }}
          </span>
          <span class="text-xs text-muted w-8 text-right shrink-0">
            {{ item.pct }}%
          </span>
        </div>
      </div>
    </div>
  </UPageCard>
</template>

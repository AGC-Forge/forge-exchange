<script setup lang="ts">
import type { SelectItem } from "@nuxt/ui";

definePageMeta({
  layout: "auth",
  middleware: "auth",
  validate: (params) => {
    //@ts-expect-error id is a string
    return /^[a-zA-Z0-9-]+$/.test(params.id);
  },
});
useSeoMeta({
  title: "Analytics Detail",
  description: "View your campaign analytics detail.",
  robots: "noindex, nofollow",
});
const route = useRoute();
const id = route.params.id as string;

const {
  campaignData: data,
  isLoading,
  fetchCampaignAnalytics,
} = useAnalytics();

const period = ref("7d");
const executionSource = ref<"" | "none" | "pool" | "integration">("");
const periods = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
];
const executionSources: SelectItem[] = [
  { label: "All Sources", value: "" },
  { label: "No Proxy", value: "none" },
  { label: "Proxy Pool", value: "pool" },
  { label: "Integration", value: "integration" },
];

const periodLabel = computed(
  () => periods.find((p) => p.value === period.value)?.label ?? "7 Days",
);

function setPeriod(p: string) {
  period.value = p;
  fetchCampaignAnalytics(id, p, executionSource.value);
}

function setExecutionSource(value: "" | "none" | "pool" | "integration") {
  executionSource.value = value;
  fetchCampaignAnalytics(id, period.value, executionSource.value);
}

const barColors = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
];

const executionColors: Record<string, string> = {
  none: "#f59e0b",
  pool: "#6366f1",
  integration: "#10b981",
};

function flag(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(c.charCodeAt(0) + 127397));
}

function executionLabel(source: string): string {
  return (
    {
      none: "No Proxy",
      pool: "Proxy Pool",
      integration: "Integration",
    }[source] ?? source
  );
}

function deviceIcon(device: string): string {
  const map: Record<string, string> = {
    desktop: "i-heroicons-computer-desktop",
    mobile: "i-heroicons-device-phone-mobile",
    tablet: "i-heroicons-device-tablet",
  };
  return map[device] ?? "i-heroicons-computer-desktop";
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusColor(status: string): any {
  const map: Record<string, string> = {
    running: "success",
    queued: "info",
    paused: "warning",
    draft: "neutral",
    completed: "primary",
    failed: "error",
    cancelled: "neutral",
  };
  return map[status] ?? "neutral";
}

onMounted(() => fetchCampaignAnalytics(id, period.value, executionSource.value));
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Back + header -->
    <div class="flex items-center gap-3 flex-wrap">
      <UButton
        to="/analytics"
        icon="i-heroicons-arrow-left"
        variant="ghost"
        color="neutral"
        size="sm"
      />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <h1 class="text-xl font-bold tracking-tight truncate">
            {{ data?.campaign?.name ?? "Loading..." }}
          </h1>
          <UBadge
            v-if="data?.campaign"
            :color="statusColor(data.campaign.status)"
            variant="soft"
            size="sm"
          >
            {{ data.campaign.status }}
          </UBadge>
        </div>
        <p class="text-xs text-muted mt-0.5 truncate">
          {{ data?.campaign?.targetUrl }}
        </p>
      </div>

      <!-- Period selector -->
      <div class="flex items-center gap-2 flex-wrap">
        <div
          class="flex items-center gap-1 bg-muted border border-muted rounded-xl p-1"
        >
          <button
            v-for="p in periods"
            :key="p.value"
            class="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
            :class="
              period === p.value
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                : 'text-muted'
            "
            @click="setPeriod(p.value)"
          >
            {{ p.label }}
          </button>
        </div>
        <USelect
          :model-value="executionSource"
          :items="executionSources"
          size="sm"
          class="min-w-40"
          @update:model-value="setExecutionSource(($event ?? '') as '' | 'none' | 'pool' | 'integration')"
        />
      </div>
    </div>

    <!-- Key metrics -->
    <div class="grid grid-cols-2 lg:grid-cols-8 gap-3">
      <StatsCard
        label="Total Sessions"
        :value="data?.metrics.totalSessions"
        icon="i-heroicons-cursor-arrow-rays"
        color="indigo"
        format="compact"
        :loading="isLoading"
        class="lg:col-span-1"
      />
      <StatsCard
        label="Success"
        :value="data?.metrics.successSessions"
        icon="i-heroicons-check-circle"
        color="emerald"
        format="compact"
        :loading="isLoading"
        class="lg:col-span-1"
      />
      <StatsCard
        label="Failed"
        :value="data?.metrics.failedSessions"
        icon="i-heroicons-x-circle"
        color="red"
        format="compact"
        :loading="isLoading"
        class="lg:col-span-1"
      />
      <StatsCard
        label="Success Rate"
        :value="data?.metrics.successRate"
        unit="%"
        icon="i-heroicons-check-badge"
        color="emerald"
        format="none"
        :loading="isLoading"
        class="lg:col-span-1"
      />
      <StatsCard
        label="Bounce Rate"
        :value="data?.metrics.bounceRate"
        unit="%"
        icon="i-heroicons-arrow-uturn-left"
        color="amber"
        format="none"
        :loading="isLoading"
        class="lg:col-span-1"
      />
      <StatsCard
        label="Avg Duration"
        :value="formatDuration(data?.metrics.avgDuration)"
        icon="i-heroicons-clock"
        color="blue"
        format="none"
        :loading="isLoading"
        class="lg:col-span-1"
      />
      <StatsCard
        label="Mismatch"
        :value="data?.metrics.mismatchRate"
        unit="%"
        icon="i-heroicons-map-pin"
        color="amber"
        format="none"
        :loading="isLoading"
        class="lg:col-span-1"
      />
      <StatsCard
        label="No Proxy"
        :value="data?.metrics.noProxyRatio"
        unit="%"
        icon="i-heroicons-exclamation-triangle"
        color="amber"
        format="none"
        :loading="isLoading"
        class="lg:col-span-1"
      />
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Hourly chart -->
      <div class="bg-muted border border-muted rounded-xl overflow-hidden">
        <div class="px-5 py-4 border-b border-muted">
          <h3 class="text-sm font-semibold text-muted">
            Sessions per Hour (24h)
          </h3>
        </div>
        <div class="p-5">
          <AnalyticsLineChart
            :data="data?.charts.hourly ?? []"
            :loading="isLoading"
            color="#6366f1"
            label="Sessions"
          />
        </div>
      </div>

      <!-- Daily trend -->
      <div class="bg-muted border border-muted rounded-xl overflow-hidden">
        <div class="px-5 py-4 border-b border-muted">
          <h3 class="text-sm font-semibold text-muted">Daily Trend</h3>
          <p class="text-xs text-muted mt-0.5">{{ periodLabel }}</p>
        </div>
        <div class="p-5">
          <AnalyticsDualChart
            :data="data?.charts.daily ?? []"
            :loading="isLoading"
          />
        </div>
      </div>
    </div>

    <!-- Breakdown row -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <!-- Observed GEO breakdown -->
      <div class="bg-muted border border-muted rounded-xl overflow-hidden">
        <div class="px-5 py-4 border-b border-muted">
          <h3 class="text-sm font-semibold text-muted">Observed GEO</h3>
          <p class="text-xs text-muted mt-0.5">
            Negara hasil observasi runtime
          </p>
        </div>
        <div class="p-4 space-y-2.5">
          <div v-if="isLoading" class="space-y-2">
            <div
              v-for="i in 5"
              :key="i"
              class="h-7 bg-muted rounded animate-pulse"
            />
          </div>
          <template v-else>
            <div
              v-for="(g, i) in data?.breakdown.geo ?? []"
              :key="g.country"
              class="flex items-center gap-2.5"
            >
              <div class="flex items-center gap-1.5 w-20 shrink-0">
                <span class="text-base leading-none">{{
                  flag(g.country)
                }}</span>
                <span class="text-xs text-muted font-medium">{{
                  g.country
                }}</span>
              </div>
              <div class="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full"
                  :style="{
                    width: `${g.pct}%`,
                    background: barColors[i % barColors.length],
                  }"
                />
              </div>
              <span class="text-xs text-muted tabular-nums w-16 text-right">
                {{ g.count.toLocaleString() }} ({{ g.pct }}%)
              </span>
            </div>
            <p
              v-if="!data?.breakdown.geo?.length"
              class="text-center text-sm text-muted py-4"
            >
              No Data Available
            </p>
          </template>
        </div>
      </div>

      <!-- Target GEO breakdown -->
      <div class="bg-muted border border-muted rounded-xl overflow-hidden">
        <div class="px-5 py-4 border-b border-muted">
          <h3 class="text-sm font-semibold">Target GEO</h3>
          <p class="text-xs text-muted mt-0.5">
            Intent country dari campaign
          </p>
        </div>
        <div class="p-4 space-y-2.5">
          <div v-if="isLoading" class="space-y-2">
            <div
              v-for="i in 5"
              :key="i"
              class="h-7 bg-muted rounded animate-pulse"
            />
          </div>
          <template v-else>
            <div
              v-for="(g, i) in data?.breakdown.targetGeo ?? []"
              :key="`target-${g.country}`"
              class="flex items-center gap-2.5"
            >
              <div class="flex items-center gap-1.5 w-20 shrink-0">
                <span class="text-base leading-none">{{ flag(g.country) }}</span>
                <span class="text-xs text-muted font-medium">{{ g.country }}</span>
              </div>
              <div class="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full"
                  :style="{
                    width: `${g.pct}%`,
                    background: barColors[i % barColors.length],
                  }"
                />
              </div>
              <span class="text-xs text-muted tabular-nums w-16 text-right">
                {{ g.count.toLocaleString() }} ({{ g.pct }}%)
              </span>
            </div>
            <p
              v-if="!data?.breakdown.targetGeo?.length"
              class="text-center text-sm text-muted py-4"
            >
              No target GEO data
            </p>
          </template>
        </div>
      </div>

      <!-- Device breakdown -->
      <div class="bg-muted border border-muted rounded-xl overflow-hidden">
        <div class="px-5 py-4 border-b border-muted">
          <h3 class="text-sm font-semibold">Device Type</h3>
        </div>
        <div class="p-4 space-y-3">
          <div v-if="isLoading" class="space-y-2">
            <div
              v-for="i in 3"
              :key="i"
              class="h-10 bg-muted rounded animate-pulse"
            />
          </div>
          <template v-else>
            <div
              v-for="d in data?.breakdown.devices ?? []"
              :key="d.device"
              class="space-y-1.5"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon
                    :name="deviceIcon(d.device)"
                    class="w-4 h-4 text-muted"
                  />
                  <span class="text-sm text-muted capitalize">{{
                    d.device
                  }}</span>
                </div>
                <span class="text-sm font-medium text-muted tabular-nums"
                  >{{ d.pct }}%</span
                >
              </div>
              <div class="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full bg-indigo-500 transition-all"
                  :style="{ width: `${d.pct}%` }"
                />
              </div>
            </div>
            <p
              v-if="!data?.breakdown.devices?.length"
              class="text-center text-sm text-muted py-4"
            >
              Belum ada data
            </p>
          </template>
        </div>
      </div>

      <!-- Execution source -->
      <div class="bg-muted border border-muted rounded-xl overflow-hidden">
        <div class="px-5 py-4 border-b border-muted">
          <h3 class="text-sm font-semibold">Execution Source</h3>
          <p class="text-xs text-muted mt-0.5">
            Jalur eksekusi sesi campaign ini
          </p>
        </div>
        <div class="p-4 space-y-3">
          <div v-if="isLoading" class="space-y-2">
            <div
              v-for="i in 4"
              :key="i"
              class="h-10 bg-muted rounded animate-pulse"
            />
          </div>
          <template v-else>
            <div
              v-for="item in data?.breakdown.executionSources ?? []"
              :key="item.source"
              class="space-y-1.5"
            >
              <div class="flex justify-between text-xs mb-1">
                <span class="text-muted">{{ executionLabel(item.source) }}</span>
                <span class="text-muted tabular-nums">
                  {{ item.count.toLocaleString() }} ({{ item.pct }}%)
                </span>
              </div>
              <div class="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  :style="{
                    width: `${item.pct}%`,
                    background: executionColors[item.source] ?? '#94a3b8',
                  }"
                />
              </div>
            </div>
            <p
              v-if="!data?.breakdown.executionSources?.length"
              class="text-center text-sm text-muted py-4"
            >
              Belum ada data execution source
            </p>
          </template>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="bg-muted border border-muted rounded-xl overflow-hidden">
        <div class="px-5 py-4 border-b border-muted">
          <h3 class="text-sm font-semibold">Browser</h3>
        </div>
        <div class="p-4 space-y-3">
          <div v-if="isLoading" class="space-y-2">
            <div
              v-for="i in 4"
              :key="i"
              class="h-10 bg-muted rounded animate-pulse"
            />
          </div>
          <template v-else>
            <div
              v-for="(b, i) in data?.breakdown.browsers ?? []"
              :key="b.browser"
              class="flex items-center gap-3"
            >
              <div
                class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                :style="{
                  background: barColors[i % barColors.length] + '20',
                  color: barColors[i % barColors.length],
                }"
              >
                {{ b.browser.charAt(0) }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-muted">{{ b.browser }}</span>
                  <span class="text-muted tabular-nums">{{
                    b.count.toLocaleString()
                  }}</span>
                </div>
                <div class="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all"
                    :style="{
                      width: `${b.pct}%`,
                      background: barColors[i % barColors.length],
                    }"
                  />
                </div>
              </div>
              <span class="text-xs text-muted tabular-nums w-8 text-right"
                >{{ b.pct }}%</span
              >
            </div>
            <p
              v-if="!data?.breakdown.browsers?.length"
              class="text-center text-sm text-muted py-4"
            >
              Belum ada data
            </p>
          </template>
        </div>
      </div>

      <div class="bg-muted border border-muted rounded-xl overflow-hidden">
        <div class="px-5 py-4 border-b border-muted">
          <h3 class="text-sm font-semibold">GEO Quality</h3>
          <p class="text-xs text-muted mt-0.5">
            Target vs observed untuk session yang comparable
          </p>
        </div>
        <div class="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="rounded-lg border border-muted p-3">
            <p class="text-xs uppercase tracking-wide">Comparable</p>
            <p class="mt-1 text-lg font-semibold">
              {{ (data?.metrics.comparableGeoSessions ?? 0).toLocaleString() }}
            </p>
          </div>
          <div class="rounded-lg border border-muted p-3">
            <p class="text-xs uppercase tracking-wide">Matched</p>
            <p class="mt-1 text-lg font-semibold text-emerald-500">
              {{
                (data?.breakdown.geoQuality?.matchedSessions ?? 0).toLocaleString()
              }}
            </p>
          </div>
          <div class="rounded-lg border border-muted p-3">
            <p class="text-xs uppercase tracking-wide">Mismatched</p>
            <p class="mt-1 text-lg font-semibold text-amber-500">
              {{
                (data?.breakdown.geoQuality?.mismatchedSessions ?? 0).toLocaleString()
              }}
            </p>
          </div>
          <div class="sm:col-span-3 rounded-lg border border-muted p-3">
            <p class="text-xs uppercase tracking-wide">Insight</p>
            <p class="mt-1 text-sm text-muted">
              {{
                (data?.metrics.noProxyRatio ?? 0) > 0
                  ? "Campaign ini punya sesi tanpa proxy. Mismatch GEO perlu dibaca bersama no-proxy ratio karena target country bisa berbeda dari hasil observasi aktual."
                  : "Campaign ini mayoritas memakai proxy backing atau integration. Jika mismatch tetap tinggi, cek kualitas routing proxy atau konfigurasi provider."
              }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-muted border border-muted rounded-xl overflow-hidden">
      <div class="px-5 py-4 border-b border-muted">
        <h3 class="text-sm font-semibold">Top Mismatch Countries</h3>
        <p class="text-xs text-muted mt-0.5">
          Kombinasi target vs observed yang paling sering berbeda
        </p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-muted">
              <th class="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide">
                Target
              </th>
              <th class="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">
                Observed
              </th>
              <th class="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide">
                Sessions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-muted">
            <tr
              v-for="row in data?.breakdown.mismatchCountries ?? []"
              :key="`${row.targetCountry}-${row.observedCountry}`"
            >
              <td class="px-5 py-3">
                <span class="inline-flex items-center gap-2">
                  <span>{{ flag(row.targetCountry) }}</span>
                  <span>{{ row.targetCountry }}</span>
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-2">
                  <span>{{ flag(row.observedCountry) }}</span>
                  <span>{{ row.observedCountry }}</span>
                </span>
              </td>
              <td class="px-4 py-3 text-right tabular-nums">
                {{ row.count.toLocaleString() }}
              </td>
            </tr>
            <tr v-if="!(data?.breakdown.mismatchCountries?.length)">
              <td colspan="3" class="text-center py-8 text-sm text-muted">
                Tidak ada mismatch country pada filter ini
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Campaign info footer -->
    <div
      v-if="data?.campaign"
      class="bg-muted border border-muted rounded-xl p-5"
    >
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p class="text-xs uppercase tracking-wide mb-1">Daily Limit</p>
          <p class="text-muted font-medium">
            {{ data.campaign.dailyLimit.toLocaleString() }}/day
          </p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide mb-1">Total All-time</p>
          <p class="font-medium text-muted">
            {{ data.campaign.totalSessions.toLocaleString() }}
          </p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide mb-1">Campaign Started</p>
          <p class="text-muted font-medium">
            {{
              data.campaign.startedAt
                ? formatDate(data.campaign.startedAt)
                : "—"
            }}
          </p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide mb-1">Created At</p>
          <p class="text-muted font-medium">
            {{ formatDate(data.campaign.createdAt) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

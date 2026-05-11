<script setup lang="ts">
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
const periods = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
];

const periodLabel = computed(
  () => periods.find((p) => p.value === period.value)?.label ?? "7 Days",
);

function setPeriod(p: string) {
  period.value = p;
  fetchCampaignAnalytics(id, p);
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

function flag(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(c.charCodeAt(0) + 127397));
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

onMounted(() => fetchCampaignAnalytics(id, period.value));
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
    </div>

    <!-- Key metrics -->
    <div class="grid grid-cols-2 lg:grid-cols-6 gap-3">
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
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- GEO breakdown -->
      <div class="bg-muted border border-muted rounded-xl overflow-hidden">
        <div class="px-5 py-4 border-b border-muted">
          <h3 class="text-sm font-semibold text-muted">GEO Breakdown</h3>
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

      <!-- Browser breakdown -->
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

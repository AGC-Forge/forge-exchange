<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Analytics",
  description: "View your analytics.",
  robots: "noindex, nofollow",
});

const { globalData: data, isLoading, fetchOverview } = useAnalytics();

const period = ref("7d");
const periods = [
  { label: "24h", value: "24h" },
  { label: "7 Day", value: "7d" },
  { label: "30 Day", value: "30d" },
  { label: "90 Day", value: "90d" },
];

const periodLabel = computed(
  () => periods.find((p) => p.value === period.value)?.label ?? "7 Day",
);

function setPeriod(p: string) {
  period.value = p;
  fetchOverview(p);
}

// ── Campaigns table ───────────────────────────────────────────
const campaignSearch = ref("");
const campaignsLoading = ref(false);
const campaigns = ref<any[]>([]);

async function loadCampaigns() {
  campaignsLoading.value = true;
  try {
    const res = await $fetch("/api/campaigns", {
      query: { limit: 50, orderBy: "totalSessions", order: "desc" },
    });
    campaigns.value = res.data?.campaigns ?? [];
  } finally {
    campaignsLoading.value = false;
  }
}

const filteredCampaigns = computed(() =>
  campaigns.value.filter(
    (c) =>
      !campaignSearch.value ||
      c.name.toLowerCase().includes(campaignSearch.value.toLowerCase()),
  ),
);

// ── Helpers ───────────────────────────────────────────────────
const geoColors = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
];

function flag(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(c.charCodeAt(0) + 127397));
}

function campaignSuccessRate(c: any): number {
  const total = c.successCount + c.failCount;
  return total > 0 ? Math.round((c.successCount / total) * 100) : 0;
}

function successRateColor(c: any): string {
  const r = campaignSuccessRate(c);
  if (r >= 80) return "bg-emerald-500 dark:bg-emerald-400";
  if (r >= 50) return "bg-amber-500 dark:bg-amber-400";
  return "bg-red-500 dark:bg-red-400";
}

function successRateTextColor(c: any): string {
  const r = campaignSuccessRate(c);
  if (r >= 80) return "text-emerald-500 dark:text-emerald-400";
  if (r >= 50) return "text-amber-500 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
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

onMounted(() => {
  fetchOverview(period.value);
  loadCampaigns();
});
</script>

<template>
  <AppDashboardLayout id="analytics" title="Analytics">
    <template #content>
      <div class="min-h-screen p-6">
        <div class="mx-auto max-w-7xl space-y-6">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 class="text-2xl font-bold tracking-tight">Analytics</h1>
              <p class="text-sm text-muted mt-0.5">
                Overview of the performance of all your campaigns
              </p>
            </div>
            <!-- Period selector -->
            <div
              class="flex items-center gap-1 bg-muted border border-muted rounded-xl p-1"
            >
              <button
                v-for="p in periods"
                :key="p.value"
                class="px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all cursor-pointer active:scale-95"
                :class="
                  period === p.value
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted'
                "
                @click="setPeriod(p.value)"
              >
                {{ p.label }}
              </button>
            </div>
          </div>

          <!-- Top metrics -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AppDashboardStatsCard
              label="Total Sessions"
              :value="data?.totalSessions"
              icon="i-heroicons-cursor-arrow-rays"
              color="indigo"
              format="compact"
              :loading="isLoading"
            />
            <AppDashboardStatsCard
              label="Today"
              :value="data?.todaySessions"
              icon="i-heroicons-calendar-days"
              color="emerald"
              format="compact"
              :loading="isLoading"
            />
            <AppDashboardStatsCard
              label="Success Rate"
              :value="data?.successRate"
              unit="%"
              icon="i-heroicons-check-badge"
              color="emerald"
              format="none"
              :loading="isLoading"
            />
            <AppDashboardStatsCard
              label="Active Proxies"
              :value="data?.activeProxies"
              icon="i-heroicons-globe-alt"
              color="purple"
              :loading="isLoading"
            />
          </div>

          <!-- Charts row -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <!-- Traffic trend -->
            <div
              class="lg:col-span-2 bg-muted border border-muted rounded-xl overflow-hidden"
            >
              <div class="px-5 py-4 border-b border-muted">
                <h3 class="text-sm font-semibold">Traffic Trend</h3>
                <p class="text-xs text-muted mt-0.5">
                  Sessions per hour ({{ periodLabel }})
                </p>
              </div>
              <div class="p-5">
                <AppAnalyticsLineChart
                  :data="data?.hourly ?? []"
                  :loading="isLoading"
                  color="#6366f1"
                  label="Sessions"
                />
              </div>
            </div>

            <!-- GEO distribution -->
            <div
              class="bg-muted border border-muted rounded-xl overflow-hidden"
            >
              <div class="px-5 py-4 border-b border-muted">
                <h3 class="text-sm font-semibold">Top Countries</h3>
                <p class="text-xs text-muted mt-0.5">{{ periodLabel }}</p>
              </div>
              <div class="p-4 space-y-2.5">
                <div v-if="isLoading" class="space-y-2">
                  <div
                    v-for="i in 6"
                    :key="i"
                    class="h-7 bg-muted rounded-lg animate-pulse"
                  />
                </div>
                <template v-else>
                  <div
                    v-for="(g, i) in (data?.geoStats ?? []).slice(0, 8)"
                    :key="g.country"
                    class="flex items-center gap-2.5"
                  >
                    <span class="text-xs text-muted w-4 text-right">{{
                      i + 1
                    }}</span>
                    <div class="flex items-center gap-1.5 w-20 shrink-0">
                      <span class="text-base leading-none">{{
                        flag(g.country)
                      }}</span>
                      <span class="text-xs text-muted font-medium">{{
                        g.country
                      }}</span>
                    </div>
                    <div
                      class="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"
                    >
                      <div
                        class="h-full rounded-full"
                        :style="{
                          width: `${g.pct}%`,
                          background: geoColors[i % geoColors.length],
                        }"
                      />
                    </div>
                    <span
                      class="text-xs text-muted tabular-nums w-10 text-right"
                      >{{ g.pct }}%</span
                    >
                  </div>
                  <p
                    v-if="!data?.geoStats?.length"
                    class="text-center text-sm text-muted py-4"
                  >
                    No GEO data yet
                  </p>
                </template>
              </div>
            </div>
          </div>

          <!-- Campaign table -->
          <div class="bg-muted border border-muted rounded-xl overflow-hidden">
            <div
              class="flex items-center justify-between px-5 py-4 border-b border-muted"
            >
              <h3 class="text-sm font-semibold">Campaign Performance</h3>
              <UInput
                v-model="campaignSearch"
                icon="i-heroicons-magnifying-glass"
                placeholder="Search campaign..."
                size="sm"
                class="w-48"
              />
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-muted">
                    <th
                      class="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Campaign
                    </th>
                    <th
                      class="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Status
                    </th>
                    <th
                      class="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Total
                    </th>
                    <th
                      class="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Today
                    </th>
                    <th
                      class="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Success
                    </th>
                    <th
                      class="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Rate
                    </th>
                    <th class="px-4 py-3" />
                  </tr>
                </thead>
                <tbody class="divide-y divide-muted">
                  <tr v-if="campaignsLoading">
                    <td colspan="7" class="text-center py-10">
                      <UIcon
                        name="i-heroicons-arrow-path"
                        class="w-6 h-6 text-muted animate-spin mx-auto"
                      />
                    </td>
                  </tr>
                  <tr v-else-if="filteredCampaigns.length === 0">
                    <td colspan="7" class="text-center py-10">
                      <p class="text-sm text-muted">No campaign data yet</p>
                    </td>
                  </tr>
                  <tr
                    v-else
                    v-for="c in filteredCampaigns"
                    :key="c.id"
                    class="hover:bg-muted transition-colors"
                  >
                    <td class="px-5 py-3.5">
                      <p class="font-medium truncate max-w-50">{{ c.name }}</p>
                      <p class="text-xs text-muted truncate max-w-50">
                        {{ c.targetUrl }}
                      </p>
                    </td>
                    <td class="px-4 py-3.5">
                      <UBadge
                        :color="statusColor(c.status)"
                        variant="soft"
                        size="xs"
                      >
                        {{ c.status }}
                      </UBadge>
                    </td>
                    <td class="px-4 py-3.5 text-right">
                      <span class="font-medium tabular-nums">
                        {{ c.totalSessions.toLocaleString() }}
                      </span>
                    </td>
                    <td class="px-4 py-3.5 text-right">
                      <span
                        class="text-emerald-500 dark:text-emerald-400 tabular-nums"
                      >
                        {{ c.todayCount.toLocaleString() }}
                      </span>
                    </td>
                    <td class="px-4 py-3.5 text-right">
                      <span class="text-secondary tabular-nums">
                        {{ c.successCount.toLocaleString() }}
                      </span>
                    </td>
                    <td class="px-4 py-3.5 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <div
                          class="w-12 h-1.5 bg-muted rounded-full overflow-hidden"
                        >
                          <div
                            class="h-full rounded-full"
                            :class="successRateColor(c)"
                            :style="{ width: `${campaignSuccessRate(c)}%` }"
                          />
                        </div>
                        <span
                          class="text-xs tabular-nums"
                          :class="successRateTextColor(c)"
                        >
                          {{ campaignSuccessRate(c) }}%
                        </span>
                      </div>
                    </td>
                    <td class="px-4 py-3.5">
                      <UButton
                        :to="`/app/analytics/${c.id}`"
                        icon="i-heroicons-arrow-right"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </template>
  </AppDashboardLayout>
</template>

<style scoped></style>

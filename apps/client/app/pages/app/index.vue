<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Dashboard",
  description:
    "Welcome to your dashboard. Here you can manage your account and view your activity.",
  robots: "noindex, nofollow",
});

const { user } = useUserSession();
const { activeSessions, onlineWorkers, queueSize } = useRealtime();

// ── Date ─────────────────────────────────────────────────────
const today = computed(() =>
  new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
);

const creditBalance = computed(
  () => user.value?.subscription?.creditBalance ?? 0,
);

// ── Data ──────────────────────────────────────────────────────
const isLoading = ref(true);

const overview = ref({
  totalSessions: 0,
  todaySessions: 0,
  activeCampaigns: 0,
  successRate: 0,
  activeProxies: 0,
});

const geoData = ref<{ country: string; count: number; pct: number }[]>([]);
const liveSessions = ref<any[]>([]);
const workerList = ref<any[]>([]);
const recentFingerprints = ref<any[]>([]);
const recentCampaigns = ref<any[]>([]);

// ── Fetch overview ────────────────────────────────────────────
async function loadDashboard() {
  isLoading.value = true;
  try {
    const [ovRes, sessionRes, workerRes, campaignRes, fpRes] = await Promise.all([
      $fetch("/api/analytics/overview"),
      $fetch("/api/sessions/live"),
      $fetch("/api/workers"),
      $fetch("/api/campaigns", {
        query: { limit: 5, orderBy: "createdAt", order: "desc" },
      }),
      $fetch("/api/fingerprints/recent", {
        query: { limit: 10 },
      }),
    ]);

    overview.value = ovRes.data ?? overview.value;
    geoData.value = ovRes.data?.geoStats ?? [];
    liveSessions.value = sessionRes.data?.sessions ?? [];
    workerList.value = workerRes.data?.workers ?? [];
    recentFingerprints.value = fpRes.data?.fingerprints ?? [];
    recentCampaigns.value = campaignRes.data?.campaigns ?? [];
  } catch (err) {
    console.error("Dashboard load failed:", err);
  } finally {
    isLoading.value = false;
  }
}

// ── Auto refresh every 30s ────────────────────────────────────
let refreshTimer: ReturnType<typeof setInterval>;

onMounted(() => {
  loadDashboard();
  refreshTimer = setInterval(loadDashboard, 30_000);
});

onUnmounted(() => clearInterval(refreshTimer));

// ── Helpers ───────────────────────────────────────────────────
function campaignDot(status: string): string {
  const map: Record<string, string> = {
    running: "bg-emerald-400 shadow-[0_0_6px_#10b981] animate-pulse",
    queued: "bg-blue-400",
    paused: "bg-amber-400",
    draft: "bg-neutral-600",
    completed: "bg-indigo-400",
    failed: "bg-red-400",
    cancelled: "bg-neutral-700",
  };
  return map[status] ?? "bg-neutral-600";
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
</script>

<template>
  <AppDashboardLayout id="dashboard" title="Dashboard">
    <template #content>
      <div class="min-h-screen p-6">
        <div class="mx-auto max-w-7xl space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold tracking-tight">
                Welcome,
                <span class="font-medium text-primary">
                  {{ user?.name ?? "Sob" }}
                </span>
                👋
              </h1>
              <p class="text-sm text-muted mt-0.5">
                {{ today }} · Balance:
                <span class="text-amber-400 font-medium"
                  >{{ creditBalance.toLocaleString() }} credit</span
                >
              </p>
            </div>
            <UButton
              to="/app/campaigns/create"
              icon="i-heroicons-plus"
              color="primary"
              size="md"
              class="text-white hidden sm:flex"
            >
              Create Campaign
            </UButton>
          </div>
          <!-- Stats cards -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AppDashboardStatsCard
              label="Total Sessions"
              :value="overview.totalSessions"
              icon="i-heroicons-cursor-arrow-rays"
              color="indigo"
              format="compact"
              :loading="isLoading"
            />
            <AppDashboardStatsCard
              label="Sessions Today"
              :value="overview.todaySessions"
              icon="i-heroicons-calendar-days"
              color="emerald"
              format="compact"
              :loading="isLoading"
            />
            <AppDashboardStatsCard
              label="Active Campaigns"
              :value="overview.activeCampaigns"
              icon="i-heroicons-megaphone"
              color="amber"
              :loading="isLoading"
            />
            <AppDashboardStatsCard
              label="Success Rate"
              :value="overview.successRate"
              unit="%"
              icon="i-heroicons-check-badge"
              color="emerald"
              format="none"
              :loading="isLoading"
            />
          </div>

          <!-- Realtime stats row -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              class="bg-muted border border-muted rounded-xl p-4 flex items-center gap-3"
              :class="activeSessions > 0 ? 'border-emerald-500/20' : ''"
            >
              <div
                class="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0"
              >
                <span
                  class="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400"
                  :class="
                    activeSessions > 0
                      ? 'shadow-[0_0_8px_#10b981] animate-pulse'
                      : ''
                  "
                />
              </div>
              <div>
                <p class="text-xs text-muted uppercase tracking-wide">
                  Live Sessions
                </p>
                <p
                  class="text-xl font-bold text-emerald-500 dark:text-emerald-400 tabular-nums"
                >
                  {{ activeSessions }}
                </p>
              </div>
            </div>

            <div
              class="bg-muted border border-muted rounded-xl p-4 flex items-center gap-3"
            >
              <div
                class="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0"
              >
                <UIcon
                  name="i-heroicons-server"
                  class="w-4 h-4 text-muted dark:text-indigo-400"
                />
              </div>
              <div>
                <p class="text-xs text-muted uppercase tracking-wide">
                  Workers Online
                </p>
                <p
                  class="text-xl font-bold text-indigo-500 dark:text-indigo-400 tabular-nums"
                >
                  {{ onlineWorkers }}
                </p>
              </div>
            </div>

            <div
              class="bg-muted border border-muted rounded-xl p-4 flex items-center gap-3"
            >
              <div
                class="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0"
              >
                <UIcon
                  name="i-heroicons-queue-list"
                  class="w-4 h-4 text-muted dark:text-amber-400"
                />
              </div>
              <div>
                <p class="text-xs text-muted uppercase tracking-wide">
                  Queue Size
                </p>
                <p
                  class="text-xl font-bold text-amber-500 dark:text-amber-400 tabular-nums"
                >
                  {{ queueSize }}
                </p>
              </div>
            </div>

            <div
              class="bg-muted border border-muted rounded-xl p-4 flex items-center gap-3"
            >
              <div
                class="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0"
              >
                <UIcon
                  name="i-heroicons-globe-alt"
                  class="w-4 h-4 text-muted dark:text-purple-400"
                />
              </div>
              <div>
                <p class="text-xs text-muted uppercase tracking-wide">
                  Active Proxies
                </p>
                <p
                  class="text-xl font-bold text-purple-500 dark:text-purple-400 tabular-nums"
                >
                  {{ overview.activeProxies }}
                </p>
              </div>
            </div>
          </div>

          <!-- Chart + GEO row -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div class="lg:col-span-2">
              <AppDashboardTrafficChart :loading="isLoading" />
            </div>
            <div>
              <AppDashboardGeoDistribution
                :geo-data="geoData"
                :loading="isLoading"
              />
            </div>
          </div>

          <!-- Live sessions + Worker status row -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div class="lg:col-span-2">
              <AppDashboardLiveSessionsTable :sessions="liveSessions" />
            </div>
            <div>
              <AppDashboardWorkerStatus :workers="workerList" />
            </div>
          </div>

          <div class="grid grid-cols-1">
            <AppDashboardRecentFingerprints :fingerprints="recentFingerprints" />
          </div>

          <!-- Recent campaigns -->
          <div class="bg-muted border border-muted rounded-xl overflow-hidden">
            <div
              class="flex items-center justify-between px-5 py-4 border-b border-muted/6"
            >
              <h3 class="text-sm font-semibold">Recent Campaigns</h3>
              <UButton
                to="/app/campaigns"
                variant="ghost"
                color="primary"
                size="xs"
                trailing-icon="i-heroicons-arrow-right"
              >
                See All
              </UButton>
            </div>

            <div v-if="recentCampaigns.length === 0" class="text-center py-8">
              <UIcon
                name="i-heroicons-megaphone"
                class="w-8 h-8 text-muted mx-auto mb-2"
              />
              <p class="text-sm text-muted">No campaigns yet</p>
              <UButton
                to="/app/campaigns/create"
                size="sm"
                color="primary"
                icon="material-symbols:add-circle"
                class="mt-3 text-white"
              >
                Create First Campaign
              </UButton>
            </div>

            <div v-else class="divide-y divide-muted">
              <div
                v-for="c in recentCampaigns"
                :key="c.id"
                class="flex items-center gap-4 px-5 py-3.5 hover:bg-muted transition-colors"
              >
                <!-- Status dot -->
                <span
                  class="w-2 h-2 rounded-full shrink-0"
                  :class="campaignDot(c.status)"
                />

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <NuxtLink
                    :to="`/app/campaigns/${c.id}`"
                    class="text-sm font-medium text-muted hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors truncate block"
                  >
                    {{ c.name }}
                  </NuxtLink>
                  <p class="text-xs text-muted truncate">{{ c.targetUrl }}</p>
                </div>

                <!-- Stats -->
                <div class="hidden sm:flex items-center gap-6 text-right">
                  <div>
                    <p class="text-sm font-medium text-muted tabular-nums">
                      {{ c.todayCount.toLocaleString() }}
                    </p>
                    <p class="text-xs text-muted">Today</p>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-muted tabular-nums">
                      {{ c.totalSessions.toLocaleString() }}
                    </p>
                    <p class="text-xs text-muted">Total</p>
                  </div>
                </div>

                <!-- Status badge -->
                <UBadge
                  :color="statusColor(c.status)"
                  variant="soft"
                  size="xs"
                  class="shrink-0"
                >
                  {{ c.status }}
                </UBadge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </AppDashboardLayout>
</template>

<style scoped></style>

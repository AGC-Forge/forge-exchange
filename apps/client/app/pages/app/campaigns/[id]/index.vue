<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
  validate: (params) => /^[a-zA-Z0-9-]+$/.test((params as any).id),
});
useSeoMeta({
  title: "Edit Campaign",
  description: "Edit your campaign details to reach your audience.",
  robots: "noindex, nofollow",
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const id = route.params.id as string;

const campaign = ref<any>(null);
const sessions = ref<any[]>([]);
const isLoading = ref(true);
const isActing = ref(false);
const autoRefresh = ref(true);
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const {
  campaignData: analytics,
  isLoading: analyticsLoading,
  fetchCampaignAnalytics,
} = useAnalytics();
const { fetchCampaign: fetchCampaignApi } = useCampaigns();

const period = ref("7d");
const periods = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
];

async function fetchCampaign() {
  campaign.value = await fetchCampaignApi(id);
  if (!campaign.value) {
    router.push("/app/campaigns");
    return;
  } else {
    refresh();
  }
}
async function fetchSessions() {
  try {
    const res = await $fetch(`/api/campaigns/${id}/sessions`, {
      query: { limit: 20 },
    });
    sessions.value = res.data?.sessions ?? [];
  } catch {
    /* silent fail */
  }
}
async function refresh() {
  await Promise.all([
    fetchCampaign(),
    fetchSessions(),
    fetchCampaignAnalytics(id, period.value),
  ]);
  isLoading.value = false;
}
function setPeriod(p: string) {
  period.value = p;
  fetchCampaignAnalytics(id, p);
}
async function handleControl(action: "start" | "stop" | "pause") {
  isActing.value = true;
  try {
    await $fetch(`/api/campaigns/${id}/${action}`, { method: "POST" });
    toast.add({
      title: {
        start: "Campaign dimulai",
        stop: "Campaign dihentikan",
        pause: "Campaign dijeda",
      }[action],
      color: "success",
    });
    await fetchCampaign();
  } catch (err: any) {
    toast.add({
      title: "Aksi gagal",
      description: err?.data?.error?.message ?? err?.message,
      color: "error",
    });
  } finally {
    isActing.value = false;
  }
}
watch(
  () => campaign.value?.status,
  (status) => {
    if (refreshTimer) clearInterval(refreshTimer);
    if (status === "running" && autoRefresh.value) {
      refreshTimer = setInterval(() => {
        fetchCampaign();
        fetchSessions();
      }, 15_000);
    }
  },
  { immediate: true },
);
onMounted(refresh);
onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});

const isRunning = computed(() => campaign.value?.status === "running");
const isPaused = computed(() => campaign.value?.status === "paused");
const isDraft = computed(() =>
  ["draft", "completed", "cancelled", "failed"].includes(
    campaign.value?.status,
  ),
);
const canStart = computed(() =>
  ["draft", "paused", "completed"].includes(campaign.value?.status ?? ""),
);
const canPause = computed(() => isRunning.value);
const canStop = computed(() => isRunning.value || isPaused.value);

const progressPct = computed(() => {
  const c = campaign.value;
  if (!c?.totalLimit || !c?.totalSessions) return 0;
  return Math.min(100, Math.round((c.totalSessions / c.totalLimit) * 100));
});

const todayPct = computed(() => {
  const c = campaign.value;
  if (!c?.dailyLimit || !c?.todayCount) return 0;
  return Math.min(100, Math.round((c.todayCount / c.dailyLimit) * 100));
});

const successRate = computed(() => {
  const c = campaign.value;
  if (!c) return 0;
  const total = (c.successCount ?? 0) + (c.failCount ?? 0);
  return total > 0 ? Math.round((c.successCount / total) * 100) : 0;
});

const liveSessions = computed(() =>
  sessions.value.filter((s) => s.status === "running"),
);
const recentSessions = computed(() => sessions.value.slice(0, 10));

const geoTargets = computed(() =>
  (
    (campaign.value?.geoTargets ?? []) as Array<{
      country?: string;
      weight?: number | null;
      proxySource?: "none" | "pool" | "integration" | null;
      proxyPoolId?: string | null;
      integrationId?: string | null;
    }>
  ).filter((target) => Boolean(target?.country)),
);

const geoSourceCounts = computed(() => {
  return geoTargets.value.reduce(
    (acc, target) => {
      const source = target.proxySource ?? "none";
      acc[source] += 1;
      return acc;
    },
    { none: 0, pool: 0, integration: 0 },
  );
});

const hasNoProxyGeo = computed(() => geoSourceCounts.value.none > 0);

const geoSourceSummary = computed(() => {
  const counts = geoSourceCounts.value;
  const parts: string[] = [];

  if (counts.none) parts.push(`${counts.none} no-proxy`);
  if (counts.pool) parts.push(`${counts.pool} proxy pool`);
  if (counts.integration) parts.push(`${counts.integration} integration`);

  return parts.length ? parts.join(" · ") : "No GEO filter";
});

const executionGeoNote = computed(() => {
  if (!geoTargets.value.length) {
    return "Campaign ini tidak memakai GEO targeting khusus.";
  }

  if (hasNoProxyGeo.value) {
    return "Sebagian target GEO berjalan tanpa proxy. Negara target dibaca sebagai intent targeting, sedangkan negara yang muncul di analytics mengikuti hasil eksekusi aktual sesi.";
  }

  return "Analytics GEO di bawah ini merefleksikan hasil eksekusi aktual sesi dan umumnya mengikuti sumber proxy yang dipakai campaign.";
});

function statusColor(status: string) {
  const m: Record<string, string> = {
    running: "bg-success text-white",
    queued: "bg-info text-white",
    paused: "bg-warning text-white",
    draft: "bg-muted text-muted",
    completed: "bg-primary text-white",
    failed: "bg-error text-white",
    cancelled: "bg-muted text-muted",
  };
  return m[status] ?? "neutral";
}
function sessionStatusColor(status: string) {
  const m: Record<string, string> = {
    running: "bg-success text-white",
    completed: "bg-primary text-white",
    failed: "bg-error text-white",
    timeout: "bg-warning text-white",
  };
  return m[status] ?? "bg-muted text-muted";
}

function flag(code?: string) {
  if (!code) return "🌐";
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(c.charCodeAt(0) + 127397));
}

function formatDuration(ms?: number | bigint) {
  if (!ms) return "—";
  const s = Math.floor(Number(ms) / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function formatRelative(dateStr?: string) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Baru saja";
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j lalu`;
  return `${Math.floor(h / 24)}h lalu`;
}

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function modeIcon(mode?: string) {
  return mode === "premium" ? "i-heroicons-shield-check" : "i-heroicons-bolt";
}

function deviceIcon(d?: string) {
  const m: Record<string, string> = {
    desktop: "i-heroicons-computer-desktop",
    mobile: "i-heroicons-device-phone-mobile",
    tablet: "i-heroicons-device-tablet",
  };
  return m[d ?? "desktop"] ?? "i-heroicons-computer-desktop";
}

function geoSourceLabel(source?: string | null) {
  return (
    {
      none: "No Proxy",
      pool: "Proxy Pool",
      integration: "Integration",
    }[source ?? "none"] ?? "No Proxy"
  );
}

function geoSourceBadgeClass(source?: string | null) {
  return (
    {
      none: "bg-amber-500/10 text-amber-300",
      pool: "bg-indigo-500/10 text-indigo-300",
      integration: "bg-emerald-500/10 text-emerald-300",
    }[source ?? "none"] ?? "bg-amber-500/10 text-amber-300"
  );
}

function sessionExecutionLabel(session: {
  executionSource?: string | null;
  proxy?: { host?: string | null } | null;
}) {
  if (session.executionSource) {
    return geoSourceLabel(session.executionSource);
  }

  return session.proxy?.host ? "Proxy Pool" : "No Proxy";
}

function sessionExecutionBadgeClass(session: {
  executionSource?: string | null;
  proxy?: { host?: string | null } | null;
}) {
  if (session.executionSource) {
    return geoSourceBadgeClass(session.executionSource);
  }

  return session.proxy?.host
    ? "bg-indigo-500/10 text-indigo-300"
    : "bg-amber-500/10 text-amber-300";
}

function sessionCountryNote(session: {
  targetCountry?: string | null;
  observedCountry?: string | null;
  country?: string | null;
  executionSource?: string | null;
}) {
  const effectiveCountry = session.observedCountry ?? session.country ?? null;

  if (!session.targetCountry) {
    return null;
  }

  if (session.targetCountry !== effectiveCountry) {
    return `target ${session.targetCountry}`;
  }

  if (session.executionSource === "none") {
    return "intent GEO";
  }

  return null;
}

function sessionDisplayCountry(session: {
  observedCountry?: string | null;
  country?: string | null;
}) {
  return session.observedCountry ?? session.country ?? undefined;
}
</script>

<template>
  <AppDashboardLayout :id="`campaign-${id}`" title="Campaign Detail">
    <template #content>
      <div class="min-h-screen p-6">
        <!-- Loading skeleton -->
        <div v-if="isLoading" class="flex justify-center py-20">
          <UIcon
            name="i-heroicons-arrow-path"
            class="w-8 h-8 text-primary animate-spin"
          />
        </div>

        <template v-else-if="campaign">
          <div class="mx-auto max-w-7xl space-y-6">
            <!-- ── Header ──────────────────────────────────── -->
            <div class="flex items-start justify-between gap-4 flex-wrap">
              <div class="flex items-center gap-3 min-w-0">
                <UButton
                  to="/app/campaigns"
                  icon="i-heroicons-arrow-left"
                  variant="ghost"
                  color="neutral"
                  size="sm"
                />
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h1 class="text-xl font-bold tracking-tight truncate">
                      {{ campaign.name }}
                    </h1>
                    <UBadge
                      variant="soft"
                      size="sm"
                      :class="statusColor(campaign.status)"
                    >
                      <span
                        v-if="isRunning"
                        class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse mr-1 inline-block"
                      />
                      {{ campaign.status }}
                    </UBadge>
                    <UBadge
                      variant="subtle"
                      size="xs"
                      :class="
                        campaign.sessionMode === 'premium'
                          ? 'bg-purple-500 dark:bg-purple-400 text-white'
                          : 'bg-indigo-500 dark:bg-indigo-400 text-white'
                      "
                    >
                      <UIcon
                        :name="modeIcon(campaign.sessionMode)"
                        class="w-3 h-3 mr-1"
                      />
                      {{
                        campaign.sessionMode === "premium"
                          ? "Premium"
                          : "Standard"
                      }}
                    </UBadge>
                  </div>
                  <p class="text-xs text-muted mt-0.5 truncate max-w-md">
                    {{ campaign.targetUrl }}
                  </p>
                </div>
              </div>

              <!-- Action buttons -->
              <div class="flex items-center gap-2 shrink-0">
                <!-- Auto refresh toggle -->
                <UTooltip
                  :text="
                    autoRefresh
                      ? 'Turn off auto-refresh'
                      : 'Turn on auto-refresh'
                  "
                >
                  <UButton
                    :icon="
                      autoRefresh
                        ? 'i-heroicons-pause-circle'
                        : 'i-heroicons-play-circle'
                    "
                    variant="ghost"
                    color="neutral"
                    size="sm"
                    @click="autoRefresh = !autoRefresh"
                  />
                </UTooltip>

                <UButton
                  icon="i-heroicons-arrow-path"
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  :loading="isLoading"
                  @click="refresh"
                />

                <UButton
                  v-if="canStart"
                  icon="i-heroicons-play"
                  color="success"
                  variant="soft"
                  size="sm"
                  :loading="isActing"
                  @click="handleControl('start')"
                >
                  Start
                </UButton>

                <UButton
                  v-if="canPause"
                  icon="i-heroicons-pause"
                  color="warning"
                  variant="soft"
                  size="sm"
                  :loading="isActing"
                  @click="handleControl('pause')"
                >
                  Pause
                </UButton>

                <UButton
                  v-if="canStop"
                  icon="i-heroicons-stop"
                  color="error"
                  variant="soft"
                  size="sm"
                  :loading="isActing"
                  @click="handleControl('stop')"
                >
                  Stop
                </UButton>
                <UDropdownMenu
                  :items="[
                    [
                      {
                        label: 'Edit Campaign',
                        icon: 'i-heroicons-pencil-square',
                        to: `/app/campaigns/${id}/edit`,
                      },
                      {
                        label: 'View Analytics',
                        icon: 'i-heroicons-chart-bar',
                        to: `/app/analytics/${id}`,
                      },
                    ],
                  ]"
                >
                  <UButton
                    icon="i-heroicons-ellipsis-vertical"
                    variant="ghost"
                    color="neutral"
                    size="sm"
                  />
                </UDropdownMenu>
              </div>
            </div>

            <!-- ── Progress Section ────────────────────────── -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <!-- Total progress -->
              <div
                class="border border-secondary/20 rounded-xl p-5 bg-secondary/5 space-y-3"
              >
                <div class="flex items-center justify-between">
                  <span
                    class="text-xs font-medium text-muted uppercase tracking-wide"
                  >
                    Total Progress
                  </span>
                  <span class="text-sm font-bold tabular-nums">
                    {{ (campaign.totalSessions ?? 0).toLocaleString() }}
                    <span
                      v-if="campaign.totalLimit"
                      class="text-muted font-normal"
                    >
                      / {{ campaign.totalLimit.toLocaleString() }}
                    </span>
                  </span>
                </div>
                <div class="h-2.5 bg-secondary/20 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-700"
                    :class="isRunning ? 'bg-emerald-500' : 'bg-indigo-500'"
                    :style="{
                      width: `${campaign.totalLimit ? progressPct : 100}%`,
                    }"
                  />
                </div>
                <div
                  class="flex items-center justify-between text-xs text-muted"
                >
                  <span>
                    {{
                      campaign.totalLimit
                        ? `${progressPct}% selesai`
                        : "No limit"
                    }}
                  </span>
                  <span>{{ campaign.failCount ?? 0 }} failed</span>
                </div>
              </div>

              <!-- Today progress -->
              <div
                class="border border-secondary/20 rounded-xl p-5 bg-secondary/5 space-y-3"
              >
                <div class="flex items-center justify-between">
                  <span
                    class="text-xs font-medium text-muted uppercase tracking-wide"
                  >
                    Today Progress
                  </span>
                  <span class="text-sm font-bold tabular-nums">
                    {{ (campaign.todayCount ?? 0).toLocaleString() }}
                    <span class="text-muted font-normal">
                      / {{ (campaign.dailyLimit ?? 0).toLocaleString() }}
                    </span>
                  </span>
                </div>
                <div class="h-2.5 bg-secondary/20 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-700"
                    :class="todayPct >= 90 ? 'bg-amber-500' : 'bg-blue-500'"
                    :style="{ width: `${todayPct}%` }"
                  />
                </div>
                <div
                  class="flex items-center justify-between text-xs text-muted"
                >
                  <span>{{ todayPct }}% daily limit</span>
                  <span
                    v-if="isRunning"
                    class="flex items-center gap-1 text-emerald-400"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"
                    />
                    {{ liveSessions.length }} live
                  </span>
                </div>
              </div>

              <!-- Success rate -->
              <div
                class="border border-secondary/20 rounded-xl p-5 bg-secondary/5 space-y-3"
              >
                <div class="flex items-center justify-between">
                  <span
                    class="text-xs font-medium text-muted uppercase tracking-wide"
                  >
                    Success Rate
                  </span>
                  <span
                    class="text-2xl font-bold tabular-nums"
                    :class="
                      successRate >= 80
                        ? 'text-emerald-400'
                        : successRate >= 50
                          ? 'text-amber-400'
                          : 'text-red-400'
                    "
                    >{{ successRate }}%</span
                  >
                </div>
                <div class="h-2.5 bg-secondary/20 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-700"
                    :class="
                      successRate >= 80
                        ? 'bg-emerald-500'
                        : successRate >= 50
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    "
                    :style="{ width: `${successRate}%` }"
                  />
                </div>
                <div
                  class="flex items-center justify-between text-xs text-muted"
                >
                  <span>{{ campaign.successCount ?? 0 }} success</span>
                  <span>{{ campaign.failCount ?? 0 }} failed</span>
                </div>
              </div>
            </div>

            <!-- ── Live Sessions (only when running) ────────── -->
            <div
              v-if="isRunning || liveSessions.length > 0"
              class="border border-emerald-500/20 rounded-xl overflow-hidden"
            >
              <div
                class="flex items-center justify-between px-5 py-3 bg-emerald-500/5 border-b border-emerald-500/20"
              >
                <div class="flex items-center gap-2">
                  <span
                    class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]"
                  />
                  <span class="text-sm font-semibold">Live Sessions</span>
                  <UBadge color="success" variant="soft" size="xs">
                    {{ liveSessions.length }}
                  </UBadge>
                </div>
                <span class="text-xs text-muted">Auto-refresh 15s</span>
              </div>

              <div
                v-if="liveSessions.length === 0"
                class="py-8 text-center text-sm text-muted"
              >
                Waiting for active session...
              </div>

              <div v-else class="divide-y divide-secondary/10">
                <div
                  v-for="s in liveSessions"
                  :key="s.id"
                  class="flex items-center gap-4 px-5 py-3 text-sm hover:bg-secondary/5"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"
                  />
                  <span
                    class="font-mono text-xs text-muted w-24 truncate shrink-0"
                    >{{ s.id.slice(0, 8) }}…</span
                  >
                  <span class="text-lg shrink-0">{{
                    flag(sessionDisplayCountry(s))
                  }}</span>
                  <span
                    v-if="sessionCountryNote(s)"
                    class="text-[11px] text-amber-300 shrink-0"
                  >
                    {{ sessionCountryNote(s) }}
                  </span>
                  <span
                    class="rounded-full px-2 py-0.5 text-[11px] shrink-0"
                    :class="sessionExecutionBadgeClass(s)"
                  >
                    {{ sessionExecutionLabel(s) }}
                  </span>
                  <UIcon
                    :name="deviceIcon(s.deviceType)"
                    class="w-4 h-4 text-muted shrink-0"
                  />
                  <span class="flex-1 text-xs text-muted truncate">{{
                    s.userAgent?.slice(0, 60) ?? "—"
                  }}</span>
                  <span class="text-xs text-muted shrink-0">{{
                    formatRelative(s.startedAt)
                  }}</span>
                </div>
              </div>
            </div>

            <!-- ── Stat Cards (from analytics) ──────────────── -->
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div
                v-for="stat in [
                  {
                    label: 'Total Sessions',
                    value:
                      analytics?.metrics?.totalSessions ??
                      campaign.totalSessions ??
                      0,
                    icon: 'i-heroicons-cursor-arrow-rays',
                    color: 'indigo',
                  },
                  {
                    label: 'Sukses',
                    value:
                      analytics?.metrics?.successSessions ??
                      campaign.successCount ??
                      0,
                    icon: 'i-heroicons-check-circle',
                    color: 'emerald',
                  },
                  {
                    label: 'Gagal',
                    value:
                      analytics?.metrics?.failedSessions ??
                      campaign.failCount ??
                      0,
                    icon: 'i-heroicons-x-circle',
                    color: 'red',
                  },
                  {
                    label: 'Success Rate',
                    value: `${analytics?.metrics?.successRate ?? successRate}%`,
                    icon: 'i-heroicons-check-badge',
                    color: 'green',
                  },
                  {
                    label: 'Bounce Rate',
                    value: `${analytics?.metrics?.bounceRate ?? 0}%`,
                    icon: 'i-heroicons-arrow-uturn-left',
                    color: 'amber',
                  },
                  {
                    label: 'Avg Duration',
                    value: formatDuration(
                      (analytics?.metrics?.avgDuration ?? 0) * 1000,
                    ),
                    icon: 'i-heroicons-clock',
                    color: 'blue',
                  },
                ]"
                :key="stat.label"
                class="border border-secondary/20 rounded-xl p-4 bg-secondary/5"
              >
                <div class="flex items-center gap-2 mb-2">
                  <div
                    class="w-7 h-7 rounded-lg flex items-center justify-center"
                    :class="`bg-${stat.color}-500/15`"
                  >
                    <UIcon
                      :name="stat.icon"
                      class="w-4 h-4"
                      :class="`text-${stat.color}-400`"
                    />
                  </div>
                </div>
                <p class="text-xl font-bold tabular-nums">
                  {{
                    typeof stat.value === "number"
                      ? stat.value.toLocaleString()
                      : stat.value
                  }}
                </p>
                <p class="text-xs text-muted mt-0.5">{{ stat.label }}</p>
              </div>
            </div>

            <!-- ── Analytics Charts ──────────────────────────── -->
            <div class="border border-secondary/20 rounded-xl overflow-hidden">
              <!-- Period selector header -->
              <div
                class="flex items-center justify-between px-5 py-4 border-b border-secondary/20"
              >
                <h3 class="text-sm font-semibold">Session Trend</h3>
                <div
                  class="flex items-center gap-1 bg-secondary/10 rounded-lg p-1"
                >
                  <button
                    v-for="p in periods"
                    :key="p.value"
                    class="px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer active:scale-95"
                    :class="
                      period === p.value
                        ? 'bg-primary text-white'
                        : 'text-muted hover:text-default'
                    "
                    @click="setPeriod(p.value)"
                  >
                    {{ p.label }}
                  </button>
                </div>
              </div>

              <div class="p-5">
                <div
                  v-if="analyticsLoading"
                  class="h-40 flex items-center justify-center"
                >
                  <UIcon
                    name="i-heroicons-arrow-path"
                    class="w-6 h-6 animate-spin text-muted"
                  />
                </div>
                <AppAnalyticsDualChart
                  v-else
                  :data="analytics?.charts?.daily ?? []"
                  :loading="analyticsLoading"
                />
              </div>
            </div>

            <!-- ── GEO + Browser breakdown ───────────────────── -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <!-- GEO breakdown -->
              <div
                class="border border-secondary/20 rounded-xl overflow-hidden"
              >
                <div class="px-5 py-4 border-b border-secondary/20">
                  <div
                    class="flex items-center justify-between gap-3 flex-wrap"
                  >
                    <h3 class="text-sm font-semibold">GEO Distribution</h3>
                    <UBadge
                      v-if="geoTargets.length"
                      variant="soft"
                      size="xs"
                      :class="
                        hasNoProxyGeo
                          ? 'bg-amber-500/10 text-amber-300'
                          : 'bg-secondary/10 text-muted'
                      "
                    >
                      {{ geoSourceSummary }}
                    </UBadge>
                  </div>
                </div>
                <div class="p-5 space-y-2">
                  <div
                    v-if="geoTargets.length"
                    class="rounded-lg border px-3 py-2 text-xs"
                    :class="
                      hasNoProxyGeo
                        ? 'border-amber-500/20 bg-amber-500/8 text-amber-200'
                        : 'border-secondary/20 bg-secondary/5 text-muted'
                    "
                  >
                    {{ executionGeoNote }}
                  </div>
                  <div
                    v-if="!analytics?.breakdown?.geo?.length"
                    class="text-center py-6 text-sm text-muted"
                  >
                    Belum ada data GEO
                  </div>
                  <div
                    v-for="(g, i) in (analytics?.breakdown?.geo ?? []).slice(
                      0,
                      8,
                    )"
                    :key="g.country"
                    class="flex items-center gap-3"
                  >
                    <span class="text-base w-6 text-center shrink-0">{{
                      flag(g.country)
                    }}</span>
                    <span class="text-xs font-medium w-8 shrink-0">{{
                      g.country
                    }}</span>
                    <div
                      class="flex-1 h-1.5 bg-secondary/20 rounded-full overflow-hidden"
                    >
                      <div
                        class="h-full rounded-full"
                        :style="{
                          width: `${g.pct ?? 0}%`,
                          backgroundColor: [
                            '#6366f1',
                            '#8b5cf6',
                            '#06b6d4',
                            '#10b981',
                            '#f59e0b',
                            '#ef4444',
                            '#ec4899',
                            '#14b8a6',
                          ][i % 8],
                        }"
                      />
                    </div>
                    <span
                      class="text-xs text-muted w-12 text-right tabular-nums shrink-0"
                    >
                      {{ g.count.toLocaleString() }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Browser breakdown -->
              <div
                class="border border-secondary/20 rounded-xl overflow-hidden"
              >
                <div class="px-5 py-4 border-b border-secondary/20">
                  <h3 class="text-sm font-semibold">Browser & Device</h3>
                </div>
                <div class="p-5 space-y-4">
                  <!-- Browser -->
                  <div class="space-y-2">
                    <p class="text-xs text-muted font-medium">Browser</p>
                    <div
                      v-if="!analytics?.breakdown?.browsers?.length"
                      class="text-xs text-muted"
                    >
                      Belum ada data
                    </div>
                    <div
                      v-for="(b, i) in (
                        analytics?.breakdown?.browsers ?? []
                      ).slice(0, 5)"
                      :key="b.browser"
                      class="flex items-center gap-3"
                    >
                      <span
                        class="text-xs font-medium w-14 truncate capitalize shrink-0"
                        >{{ b.browser }}</span
                      >
                      <div
                        class="flex-1 h-1.5 bg-secondary/20 rounded-full overflow-hidden"
                      >
                        <div
                          class="h-full rounded-full"
                          :style="{
                            width: `${b.pct ?? 0}%`,
                            backgroundColor: [
                              '#6366f1',
                              '#8b5cf6',
                              '#06b6d4',
                              '#10b981',
                              '#f59e0b',
                            ][i % 5],
                          }"
                        />
                      </div>
                      <span
                        class="text-xs text-muted w-10 text-right tabular-nums shrink-0"
                        >{{ b.count }}</span
                      >
                    </div>
                  </div>

                  <!-- Device -->
                  <div class="space-y-2">
                    <p class="text-xs text-muted font-medium">Device</p>
                    <div
                      v-if="!analytics?.breakdown?.devices?.length"
                      class="text-xs text-muted"
                    >
                      No data devices
                    </div>
                    <div
                      v-for="d in analytics?.breakdown?.devices ?? []"
                      :key="d.device"
                      class="flex items-center gap-3"
                    >
                      <UIcon
                        :name="deviceIcon(d.device)"
                        class="w-4 h-4 text-muted shrink-0"
                      />
                      <span
                        class="text-xs font-medium w-14 capitalize shrink-0"
                        >{{ d.device }}</span
                      >
                      <div
                        class="flex-1 h-1.5 bg-secondary/20 rounded-full overflow-hidden"
                      >
                        <div
                          class="h-full bg-indigo-500 rounded-full"
                          :style="{ width: `${d.pct ?? 0}%` }"
                        />
                      </div>
                      <span
                        class="text-xs text-muted w-10 text-right tabular-nums shrink-0"
                        >{{ d.count }}</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── Recent Sessions Table ──────────────────────── -->
            <div class="border border-secondary/20 rounded-xl overflow-hidden">
              <div
                class="flex items-center justify-between px-5 py-4 border-b border-secondary/20"
              >
                <h3 class="text-sm font-semibold">Recent Sessions</h3>
                <span class="text-xs text-muted">
                  {{ recentSessions.length }} last sessions
                </span>
              </div>

              <div
                v-if="recentSessions.length === 0"
                class="py-10 text-center text-sm text-muted"
              >
                No data sessions
              </div>

              <div v-else class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-secondary/10">
                      <th
                        class="text-left px-5 py-2.5 text-xs font-medium text-muted uppercase tracking-wide"
                      >
                        Session ID
                      </th>
                      <th
                        class="text-left px-4 py-2.5 text-xs font-medium text-muted uppercase tracking-wide"
                      >
                        Status
                      </th>
                      <th
                        class="text-left px-4 py-2.5 text-xs font-medium text-muted uppercase tracking-wide"
                      >
                        GEO
                      </th>
                      <th
                        class="text-left px-4 py-2.5 text-xs font-medium text-muted uppercase tracking-wide"
                      >
                        Execution
                      </th>
                      <th
                        class="text-left px-4 py-2.5 text-xs font-medium text-muted uppercase tracking-wide"
                      >
                        Mode
                      </th>
                      <th
                        class="text-right px-4 py-2.5 text-xs font-medium text-muted uppercase tracking-wide"
                      >
                        Duration
                      </th>
                      <th
                        class="text-right px-4 py-2.5 text-xs font-medium text-muted uppercase tracking-wide"
                      >
                        Credits
                      </th>
                      <th
                        class="text-right px-4 py-2.5 text-xs font-medium text-muted uppercase tracking-wide"
                      >
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-secondary/10">
                    <tr
                      v-for="s in recentSessions"
                      :key="s.id"
                      class="hover:bg-secondary/5 transition-colors"
                    >
                      <td class="px-5 py-3">
                        <span class="font-mono text-xs text-muted"
                          >{{ s.id.slice(0, 8) }}…</span
                        >
                        <p
                          v-if="s.errorType"
                          class="text-xs text-red-400 mt-0.5"
                        >
                          {{ s.errorType }}
                        </p>
                      </td>
                      <td class="px-4 py-3">
                        <UBadge
                          variant="soft"
                          size="xs"
                          :class="sessionStatusColor(s.status)"
                        >
                          {{ s.status }}
                        </UBadge>
                      </td>
                      <td class="px-4 py-3">
                        <div class="space-y-1">
                          <span class="flex items-center gap-1.5">
                            <span>{{ flag(sessionDisplayCountry(s)) }}</span>
                            <span class="text-xs text-muted">{{
                              sessionDisplayCountry(s) ?? "—"
                            }}</span>
                          </span>
                          <p
                            v-if="sessionCountryNote(s)"
                            class="text-[11px] text-amber-300"
                          >
                            {{ sessionCountryNote(s) }}
                          </p>
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        <div class="space-y-1">
                          <span
                            class="inline-flex rounded-full px-2 py-0.5 text-[11px]"
                            :class="sessionExecutionBadgeClass(s)"
                          >
                            {{ sessionExecutionLabel(s) }}
                          </span>
                          <p
                            v-if="s.proxy?.country"
                            class="text-[11px] text-muted"
                          >
                            {{ s.proxy.country }}
                          </p>
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        <UBadge
                          variant="subtle"
                          size="xs"
                          :class="{
                            'bg-purple-500 dark:bg-purple-400 text-white':
                              s.mode === 'premium' || s.mode === 'multilogin',
                          }"
                        >
                          {{ s.mode ?? "standard" }}
                        </UBadge>
                      </td>
                      <td class="px-4 py-3 text-right text-xs tabular-nums">
                        {{ s.durationMs ? formatDuration(s.durationMs) : "—" }}
                      </td>
                      <td class="px-4 py-3 text-right text-xs tabular-nums">
                        {{ s.creditsUsed ?? "—" }}
                      </td>
                      <td class="px-4 py-3 text-right text-xs text-muted">
                        {{ formatRelative(s.startedAt) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- ── Campaign Config Summary ────────────────────── -->
            <div class="border border-secondary/20 rounded-xl overflow-hidden">
              <div class="px-5 py-4 border-b border-secondary/20">
                <h3 class="text-sm font-semibold">Campaign Configuration</h3>
              </div>
              <div
                class="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm"
              >
                <div>
                  <p class="text-xs text-muted mb-0.5">Daily Limit</p>
                  <p class="font-medium">
                    {{ campaign.dailyLimit?.toLocaleString() ?? "—" }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-0.5">Total Limit</p>
                  <p class="font-medium">
                    {{ campaign.totalLimit?.toLocaleString() ?? "Unlimited" }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-0.5">Speed Mode</p>
                  <p class="font-medium capitalize">
                    {{ campaign.speedMode ?? "—" }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-0.5">Device Type</p>
                  <p class="font-medium capitalize">
                    {{ campaign.deviceType ?? "—" }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-0.5">Min Duration</p>
                  <p class="font-medium">{{ campaign.minDuration ?? "—" }}s</p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-0.5">Max Duration</p>
                  <p class="font-medium">{{ campaign.maxDuration ?? "—" }}s</p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-0.5">Session Mode</p>
                  <p class="font-medium capitalize">
                    {{ campaign.sessionMode ?? "standard" }}
                  </p>
                </div>
                <div v-if="campaign.provider">
                  <p class="text-xs text-muted mb-0.5">Provider</p>
                  <p class="font-medium capitalize">{{ campaign.provider }}</p>
                </div>
                <div v-if="campaign.geoMode">
                  <p class="text-xs text-muted mb-0.5">GEO Mode</p>
                  <p class="font-medium capitalize">{{ campaign.geoMode }}</p>
                </div>
                <div
                  v-if="geoTargets.length"
                  class="md:col-span-2 lg:col-span-2"
                >
                  <p class="text-xs text-muted mb-0.5">Target Countries</p>
                  <div class="space-y-2">
                    <div class="flex flex-wrap gap-2">
                      <span
                        v-for="(g, index) in geoTargets"
                        :key="`${g.country}-${index}`"
                        class="inline-flex items-center gap-2 rounded-md border border-secondary/20 bg-secondary/5 px-2.5 py-1.5"
                      >
                        <span class="font-medium">
                          {{ flag(g.country) }} {{ g.country }}
                        </span>
                        <span
                          class="rounded-full px-2 py-0.5 text-[11px]"
                          :class="geoSourceBadgeClass(g.proxySource)"
                        >
                          {{ geoSourceLabel(g.proxySource) }}
                        </span>
                        <span
                          v-if="campaign.geoMode === 'weighted' && g.weight"
                          class="text-xs text-muted"
                        >
                          {{ g.weight }}%
                        </span>
                      </span>
                    </div>
                    <p
                      class="text-xs"
                      :class="hasNoProxyGeo ? 'text-amber-300' : 'text-muted'"
                    >
                      {{ geoSourceSummary }}
                    </p>
                  </div>
                </div>
                <div>
                  <p class="text-xs text-muted mb-0.5">Created At</p>
                  <p class="font-medium">
                    {{ formatDate(campaign.createdAt) }}
                  </p>
                </div>
                <div v-if="campaign.startedAt">
                  <p class="text-xs text-muted mb-0.5">Started At</p>
                  <p class="font-medium">
                    {{ formatDate(campaign.startedAt) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Not found -->
        <div v-else class="text-center py-20">
          <UIcon
            name="i-heroicons-exclamation-circle"
            class="w-12 h-12 text-muted mx-auto mb-4"
          />
          <p class="text-sm font-medium">Campaign not found</p>
          <UButton
            to="/app/campaigns"
            variant="soft"
            color="neutral"
            size="sm"
            class="mt-3"
          >
            Back to Campaigns
          </UButton>
        </div>
      </div>
    </template>
  </AppDashboardLayout>
</template>

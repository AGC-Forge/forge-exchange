<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "admin",
});
useSeoMeta({
  title: "Workers",
  description: "Manage your workers.",
  robots: "noindex, nofollow",
});
interface WorkerNode {
  id: string;
  name: string;
  hostname: string;
  ipAddress: string;
  region: string | null;
  status: "online" | "offline" | "busy" | "error" | "restarting";
  maxBrowsers: number;
  activeBrowsers: number;
  maxConcurrent: number;
  activeSessions: number;
  cpuUsage: number | null;
  ramUsage: number | null;
  ramTotal: number | null;
  ramUsed: number | null;
  crashRate: number | null;
  lastHeartbeatAt: string | null;
  uptimeSince: string | null;
  version: string | null;
  isStale: boolean;
}

// ── State ─────────────────────────────────────────────────────
const workers = ref<WorkerNode[]>([]);
const isLoading = ref(false);
const isRestarting = ref<Record<string, boolean>>({});
const toast = useToast();

// ── Fetch ─────────────────────────────────────────────────────
async function fetchWorkers() {
  isLoading.value = true;
  try {
    const res = await $fetch<any>("/api/workers");
    workers.value = res.data?.workers ?? [];
  } catch (err: any) {
    toast.add({
      title: "Gagal memuat workers",
      description: err?.data?.error?.message ?? "Coba lagi",
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
}

async function restartWorker(id: string) {
  isRestarting.value[id] = true;
  try {
    const res = await $fetch("/api/workers/restart", {
      method: "POST",
      body: { workerId: id },
    });

    if (!res.success) {
      throw new Error(res.message ?? "Try again");
    }
    toast.add({
      title: "Worker restarted",
      color: "success",
      icon: "i-heroicons-arrow-path",
    });
    await fetchWorkers();
  } catch (err) {
    toast.add({
      title: "Failed to restart worker",
      description: err instanceof Error ? err.message : "Coba lagi",
      color: "error",
    });
  } finally {
    isRestarting.value[id] = false;
  }
}

// ── Computed stats ────────────────────────────────────────────
const stats = computed(() => {
  const ws = workers.value;
  return [
    {
      label: "Total Workers",
      value: ws.length,
      icon: "i-heroicons-server",
      color: "indigo" as const,
    },
    {
      label: "Online",
      value: ws.filter((w) => w.status === "online").length,
      icon: "i-heroicons-signal",
      color: "emerald" as const,
    },
    {
      label: "Active Sessions",
      value: ws.reduce((s, w) => s + w.activeSessions, 0),
      icon: "i-heroicons-cursor-arrow-rays",
      color: "amber" as const,
    },
    {
      label: "Active Browsers",
      value: ws.reduce((s, w) => s + w.activeBrowsers, 0),
      icon: "i-heroicons-globe-alt",
      color: "blue" as const,
    },
  ];
});

// ── Helpers ───────────────────────────────────────────────────
function statusDot(status: string): string {
  const map: Record<string, string> = {
    online: "bg-emerald-400 shadow-[0_0_6px_#10b981] animate-pulse",
    busy: "bg-amber-400 shadow-[0_0_6px_#f59e0b]",
    offline: "bg-neutral-600",
    error: "bg-red-400 shadow-[0_0_6px_#ef4444]",
    restarting: "bg-blue-400 animate-pulse",
  };
  return map[status] ?? "bg-neutral-600";
}

function statusColor(status: string): any {
  const map: Record<string, string> = {
    online: "success",
    busy: "warning",
    offline: "neutral",
    error: "error",
    restarting: "info",
  };
  return map[status] ?? "neutral";
}

function resourceBarColor(pct: number): string {
  if (pct > 85) return "bg-red-500";
  if (pct > 70) return "bg-amber-500";
  return "bg-emerald-500";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m}m lalu`;
  return `${h}j lalu`;
}

function formatUptime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}GB`;
}

// ── Auto refresh every 15s ────────────────────────────────────
let timer: ReturnType<typeof setInterval>;
onMounted(() => {
  fetchWorkers();
  timer = setInterval(fetchWorkers, 15_000);
});
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <AppDashboardLayout id="workers" title="Workers">
    <template #content>
      <div class="min-h-screen p-6">
        <div class="mx-auto max-w-7xl space-y-6">
          <!-- Header -->
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 class="text-2xl font-bold tracking-tight">Worker Nodes</h1>
              <p class="text-sm text-muted mt-0.5">
                Monitor all the worker instance
              </p>
            </div>
            <UButton
              icon="i-heroicons-arrow-path"
              color="neutral"
              variant="outline"
              size="md"
              :loading="isLoading"
              @click="fetchWorkers"
            >
              Refresh
            </UButton>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AppDashboardStatsCard
              v-for="stat in stats"
              :key="stat.label"
              :label="stat.label"
              :value="stat.value"
              :icon="stat.icon"
              :color="stat.color"
              :loading="isLoading"
            />
          </div>

          <!-- Loading -->
          <div
            v-if="isLoading && workers.length === 0"
            class="flex justify-center py-16"
          >
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-8 h-8 text-primary animate-spin"
            />
          </div>

          <!-- Empty -->
          <UPageCard
            v-else-if="workers.length === 0"
            spotlight
            spotlight-color="secondary"
            :ui="{
              container:
                'border border-secondary/20 dark:border-secondary/35 rounded-xl',
            }"
          >
            <div class="flex flex-col items-center py-16 text-center">
              <UIcon
                name="i-heroicons-server"
                class="w-12 h-12 text-muted mb-4"
              />
              <h3 class="font-medium text-muted mb-1">No worker</h3>
              <p class="text-sm text-muted">
                Workers will appear here after they are started
              </p>
              <div
                class="mt-4 p-3 bg-muted rounded-lg text-left text-xs font-mono text-muted max-w-sm"
              >
                <p># Start worker with:</p>
                <p>WORKER_ID=worker-01 npm run dev</p>
              </div>
            </div>
          </UPageCard>

          <!-- Worker cards -->
          <div v-else class="space-y-4">
            <UPageCard
              v-for="worker in workers"
              :key="worker.id"
              spotlight
              :spotlight-color="
                worker.status === 'online'
                  ? 'primary'
                  : worker.status === 'error'
                    ? 'error'
                    : 'secondary'
              "
              :ui="{
                container:
                  'border border-secondary/20 dark:border-secondary/35 rounded-xl',
              }"
            >
              <!-- Top row: identity + status + actions -->
              <div
                class="flex items-start justify-between gap-4 flex-wrap mb-5"
              >
                <div class="flex items-center gap-3">
                  <div class="relative">
                    <div
                      class="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center"
                    >
                      <UIcon
                        name="i-heroicons-server"
                        class="w-5 h-5 text-muted"
                      />
                    </div>
                    <span
                      class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background"
                      :class="statusDot(worker.status)"
                    />
                  </div>
                  <div>
                    <div class="flex items-center gap-2 flex-wrap">
                      <p class="font-semibold text-sm">{{ worker.name }}</p>
                      <UBadge
                        :color="statusColor(worker.status)"
                        variant="soft"
                        size="xs"
                      >
                        {{ worker.status }}
                      </UBadge>
                      <UBadge
                        v-if="worker.isStale"
                        color="warning"
                        variant="soft"
                        size="xs"
                        icon="i-heroicons-exclamation-triangle"
                      >
                        Stale
                      </UBadge>
                    </div>
                    <p class="text-xs text-muted mt-0.5">
                      {{ worker.hostname }} · {{ worker.ipAddress }}
                      <span v-if="worker.region" class="ml-1"
                        >· {{ worker.region }}</span
                      >
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <div class="text-right text-xs text-muted hidden sm:block">
                    <p>
                      Uptime:
                      <span class="text-default font-medium">{{
                        formatUptime(worker.uptimeSince)
                      }}</span>
                    </p>
                    <p v-if="worker.lastHeartbeatAt">
                      Heartbeat:
                      <span class="text-default">{{
                        timeAgo(worker.lastHeartbeatAt)
                      }}</span>
                    </p>
                    <p v-if="worker.version">v{{ worker.version }}</p>
                  </div>
                  <UTooltip text="Restart Worker">
                    <UButton
                      icon="i-heroicons-arrow-path"
                      color="neutral"
                      variant="outline"
                      size="sm"
                      :loading="isRestarting[worker.id]"
                      @click="restartWorker(worker.id)"
                    />
                  </UTooltip>
                </div>
              </div>

              <!-- Metrics grid -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                <!-- Sessions -->
                <div class="bg-secondary/10 rounded-lg p-3">
                  <p class="text-xs text-muted uppercase tracking-wide mb-1">
                    Sessions
                  </p>
                  <p class="text-2xl font-bold tabular-nums">
                    {{ worker.activeSessions
                    }}<span class="text-sm text-muted font-normal"
                      >/{{ worker.maxConcurrent }}</span
                    >
                  </p>
                  <div
                    class="mt-2 h-1.5 bg-secondary/20 rounded-full overflow-hidden"
                  >
                    <div
                      class="h-full rounded-full transition-all"
                      :class="
                        resourceBarColor(
                          (worker.activeSessions / worker.maxConcurrent) * 100,
                        )
                      "
                      :style="{
                        width: `${Math.min(100, (worker.activeSessions / worker.maxConcurrent) * 100)}%`,
                      }"
                    />
                  </div>
                </div>

                <!-- Browsers -->
                <div class="bg-secondary/10 rounded-lg p-3">
                  <p class="text-xs text-muted uppercase tracking-wide mb-1">
                    Browsers
                  </p>
                  <p class="text-2xl font-bold tabular-nums">
                    {{ worker.activeBrowsers
                    }}<span class="text-sm text-muted font-normal"
                      >/{{ worker.maxBrowsers }}</span
                    >
                  </p>
                  <!-- Browser slot visual -->
                  <div class="flex gap-1 mt-2 flex-wrap">
                    <div
                      v-for="i in worker.maxBrowsers"
                      :key="i"
                      class="w-5 h-5 rounded border text-xs flex items-center justify-center"
                      :class="
                        i <= worker.activeBrowsers
                          ? 'bg-primary/20 border-primary/40 text-primary'
                          : 'bg-secondary/10 border-secondary/20 text-muted'
                      "
                    >
                      <UIcon name="i-heroicons-globe-alt" class="w-3 h-3" />
                    </div>
                  </div>
                </div>

                <!-- CPU -->
                <div class="bg-secondary/10 rounded-lg p-3">
                  <p class="text-xs text-muted uppercase tracking-wide mb-1">
                    CPU
                  </p>
                  <p
                    class="text-2xl font-bold tabular-nums"
                    :class="
                      (worker.cpuUsage ?? 0) > 85
                        ? 'text-red-400'
                        : (worker.cpuUsage ?? 0) > 70
                          ? 'text-amber-400'
                          : ''
                    "
                  >
                    {{ worker.cpuUsage ?? 0
                    }}<span class="text-sm text-muted font-normal">%</span>
                  </p>
                  <div
                    class="mt-2 h-1.5 bg-secondary/20 rounded-full overflow-hidden"
                  >
                    <div
                      class="h-full rounded-full transition-all"
                      :class="resourceBarColor(worker.cpuUsage ?? 0)"
                      :style="{
                        width: `${Math.min(100, worker.cpuUsage ?? 0)}%`,
                      }"
                    />
                  </div>
                </div>

                <!-- RAM -->
                <div class="bg-secondary/10 rounded-lg p-3">
                  <p class="text-xs text-muted uppercase tracking-wide mb-1">
                    RAM
                  </p>
                  <p
                    class="text-2xl font-bold tabular-nums"
                    :class="
                      (worker.ramUsage ?? 0) > 85
                        ? 'text-red-400'
                        : (worker.ramUsage ?? 0) > 70
                          ? 'text-amber-400'
                          : ''
                    "
                  >
                    {{ worker.ramUsage ?? 0
                    }}<span class="text-sm text-muted font-normal">%</span>
                  </p>
                  <div
                    class="mt-2 h-1.5 bg-secondary/20 rounded-full overflow-hidden"
                  >
                    <div
                      class="h-full rounded-full transition-all"
                      :class="resourceBarColor(worker.ramUsage ?? 0)"
                      :style="{
                        width: `${Math.min(100, worker.ramUsage ?? 0)}%`,
                      }"
                    />
                  </div>
                  <p class="text-xs text-muted mt-1">
                    {{ formatBytes(worker.ramUsed) }} /
                    {{ formatBytes(worker.ramTotal) }}
                  </p>
                </div>
              </div>

              <!-- Crash rate + extra info -->
              <div
                class="flex items-center justify-between text-xs text-muted flex-wrap gap-2 pt-3 border-t border-secondary/20"
              >
                <div class="flex items-center gap-4">
                  <span>
                    Crash rate:
                    <span
                      class="font-medium"
                      :class="
                        (worker.crashRate ?? 0) > 10 ? 'text-red-400' : ''
                      "
                    >
                      {{ worker.crashRate ?? 0 }}%
                    </span>
                  </span>
                  <span class="sm:hidden"
                    >Uptime: {{ formatUptime(worker.uptimeSince) }}</span
                  >
                </div>
                <span class="font-mono"
                  >ID: {{ worker.id.slice(0, 8) }}...</span
                >
              </div>
            </UPageCard>
          </div>

          <!-- Deployment hint -->
          <UPageCard
            spotlight
            spotlight-color="info"
            :ui="{
              container: 'border border-info/20 dark:border-info/35 rounded-xl',
            }"
          >
            <div class="flex items-start gap-3">
              <UIcon
                name="i-heroicons-information-circle"
                class="w-5 h-5 text-info shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-semibold mb-1">Scale Worker</p>
                <p class="text-xs text-muted mb-2">
                  To add more worker instance, run the following command on
                  server:
                </p>
                <div
                  class="font-mono text-xs bg-secondary/10 rounded-lg p-3 space-y-1"
                >
                  <p class="text-muted">
                    # Scale to 3 worker with Docker Compose:
                  </p>
                  <p>make scale n=3</p>
                  <p class="text-muted mt-2"># Or manual:</p>
                  <p>docker compose up -d --scale worker=3</p>
                </div>
              </div>
            </div>
          </UPageCard>
        </div>
      </div>
    </template>
  </AppDashboardLayout>
</template>

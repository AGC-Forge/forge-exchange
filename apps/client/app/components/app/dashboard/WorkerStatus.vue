<script setup lang="ts">
const props = defineProps<{
  workers: Array<{
    id: string;
    name: string;
    status: string;
    region?: string;
    ipAddress: string;
    activeSessions: number;
    maxConcurrent: number;
    activeBrowsers: number;
    maxBrowsers: number;
    cpuUsage?: number;
    ramUsage?: number;
  }>;
}>();

const workers = computed(() => props.workers ?? []);

const onlineCount = computed(
  () => workers.value.filter((w) => w.status === "online").length,
);

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

function statusColor(
  status: string,
): "success" | "warning" | "error" | "info" | "neutral" {
  const map: Record<string, any> = {
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
      class="flex items-center justify-between px-5 py-4 border-b border-secondary/20"
    >
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold">Worker Nodes</h3>
        <UBadge
          :color="onlineCount > 0 ? 'success' : 'neutral'"
          variant="soft"
          size="xs"
        >
          {{ onlineCount }} online
        </UBadge>
      </div>
      <UButton
        to="/app/workers"
        variant="ghost"
        color="secondary"
        size="xs"
        trailing-icon="i-heroicons-arrow-right"
      >
        Manage
      </UButton>
    </div>

    <!-- Empty -->
    <div
      v-if="workers.length === 0"
      class="flex flex-col items-center py-8 text-center"
    >
      <UIcon name="i-heroicons-server" class="w-8 h-8 text-neutral-700 mb-2" />
      <p class="text-sm text-neutral-500">Tidak ada worker terdaftar</p>
    </div>

    <!-- Worker list -->
    <div v-else class="divide-y divide-secondary/20">
      <div
        v-for="worker in workers"
        :key="worker.id"
        class="px-5 py-4 hover:bg-secondary/20 transition-colors"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2.5">
            <!-- Status dot -->
            <span
              class="w-2 h-2 rounded-full shrink-0"
              :class="statusDot(worker.status)"
            />
            <div>
              <p class="text-sm font-medium text-muted">
                {{ worker.name }}
              </p>
              <p class="text-xs text-muted">
                {{ worker.region ?? "local" }} · {{ worker.ipAddress }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3 text-right">
            <div>
              <p class="text-sm font-bold text-muted tabular-nums">
                {{ worker.activeSessions }}/{{ worker.maxConcurrent }}
              </p>
              <p class="text-xs text-muted">sessions</p>
            </div>
            <UBadge
              :color="statusColor(worker.status)"
              variant="soft"
              size="xs"
            >
              {{ worker.status }}
            </UBadge>
          </div>
        </div>

        <!-- Resource bars -->
        <div class="grid grid-cols-2 gap-3">
          <!-- CPU -->
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="text-muted">CPU</span>
              <span
                :class="
                  (worker?.cpuUsage ?? 0) > 80
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-muted'
                "
              >
                {{ worker.cpuUsage ?? 0 }}%
              </span>
            </div>
            <div class="h-1 bg-secondary/20 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="resourceBarColor(worker.cpuUsage ?? 0)"
                :style="{ width: `${Math.min(worker.cpuUsage ?? 0, 100)}%` }"
              />
            </div>
          </div>
          <!-- RAM -->
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="text-muted">RAM</span>
              <span
                :class="
                  (worker.ramUsage ?? 0) > 80
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-muted'
                "
              >
                {{ worker.ramUsage ?? 0 }}%
              </span>
            </div>
            <div class="h-1 bg-secondary/20 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="resourceBarColor(worker.ramUsage ?? 0)"
                :style="{ width: `${Math.min(worker.ramUsage ?? 0, 100)}%` }"
              />
            </div>
          </div>
        </div>

        <!-- Browser slots -->
        <div class="flex items-center gap-1.5 mt-3">
          <span class="text-xs text-muted mr-1">Browsers:</span>
          <div
            v-for="i in worker.maxBrowsers"
            :key="i"
            class="w-5 h-5 rounded border text-xs flex items-center justify-center transition-colors"
            :class="
              i <= worker.activeBrowsers
                ? 'bg-indigo-400 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-700 text-indigo-500 dark:text-indigo-600'
                : 'bg-white/3 dark:bg-white/8 border-white/8 text-muted'
            "
          >
            <UIcon name="i-heroicons-globe-alt" class="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  </UPageCard>
</template>

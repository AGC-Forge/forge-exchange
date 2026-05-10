<script setup lang="ts">
defineProps<{
  sessions: Array<{
    id: string;
    campaignName: string;
    targetUrl: string;
    country?: string;
    deviceType?: string;
    elapsedMs: number;
  }>;
}>();

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function countryFlag(code?: string): string {
  if (!code) return "🌐";
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(c.charCodeAt(0) + 127397));
}

function deviceIcon(type?: string): string {
  const map: Record<string, string> = {
    mobile: "i-heroicons-device-phone-mobile",
    tablet: "i-heroicons-device-tablet",
    desktop: "i-heroicons-computer-desktop",
  };
  return map[type ?? "desktop"] ?? "i-heroicons-computer-desktop";
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
      class="flex items-center justify-between px-5 py-4 border-b border-white/6"
    >
      <div class="flex items-center gap-2">
        <span
          class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981] animate-pulse"
        />
        <h3 class="text-sm font-semibold">Live Sessions</h3>
        <UBadge color="success" variant="soft" size="xs">{{
          sessions.length
        }}</UBadge>
      </div>
      <UButton
        to="/app/campaigns"
        variant="ghost"
        color="neutral"
        size="xs"
        trailing-icon="i-heroicons-arrow-right"
        class="text-primary"
      >
        Lihat semua
      </UButton>
    </div>

    <!-- Empty -->
    <div
      v-if="sessions.length === 0"
      class="flex flex-col items-center py-10 text-center"
    >
      <UIcon name="i-heroicons-circle-stack" class="w-8 h-8 text-muted mb-2" />
      <p class="text-sm text-muted">No active sessions yet</p>
      <p class="text-xs text-muted mt-0.5">
        Start campaign to view live sessions
      </p>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-muted">
            <th
              class="text-left px-5 py-2.5 text-xs font-medium text-muted uppercase tracking-wide"
            >
              Campaign
            </th>
            <th
              class="text-left px-4 py-2.5 text-xs font-medium text-muted uppercase tracking-wide"
            >
              GEO
            </th>
            <th
              class="text-left px-4 py-2.5 text-xs font-medium text-muted uppercase tracking-wide"
            >
              Device
            </th>
            <th
              class="text-left px-4 py-2.5 text-xs font-medium text-muted uppercase tracking-wide"
            >
              Duration
            </th>
            <th
              class="text-left px-4 py-2.5 text-xs font-medium text-muted uppercase tracking-wide"
            >
              Status
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/4">
          <tr
            v-for="session in sessions"
            :key="session.id"
            class="hover:bg-muted transition-colors"
          >
            <td class="px-5 py-3">
              <p class="text-muted font-medium truncate max-w-40">
                {{ session.campaignName }}
              </p>
              <p class="text-xs text-muted truncate max-w-40">
                {{ session.targetUrl }}
              </p>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-1.5">
                <span class="text-base">{{
                  countryFlag(session.country)
                }}</span>
                <span class="text-muted text-xs">{{
                  session.country ?? "—"
                }}</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <UIcon
                :name="deviceIcon(session.deviceType)"
                class="w-4 h-4 text-muted"
              />
            </td>
            <td class="px-4 py-3">
              <span class="text-muted tabular-nums text-xs">{{
                formatDuration(session.elapsedMs)
              }}</span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-1.5">
                <span
                  class="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"
                />
                <span class="text-xs text-emerald-700 dark:text-emerald-600"
                  >Running</span
                >
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UPageCard>
</template>

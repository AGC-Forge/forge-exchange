<script setup lang="ts">
const props = defineProps<{
  proxy: ProxyItem;
  isActing: boolean;
  selected?: boolean;
}>();

defineEmits<{
  (e: "test"): void;
  (e: "delete"): void;
  (e: "toggleSelect"): void;
}>();

// ── Status ────────────────────────────────────────────────────
const statusDot = computed(() => {
  const map: Record<string, string> = {
    active: "bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_6px_#10b981]",
    error: "bg-red-500 dark:bg-red-400",
    testing: "bg-amber-500 dark:bg-amber-400 animate-pulse",
    banned: "bg-amber-500 dark:bg-amber-400",
    inactive: "bg-neutral-500 dark:bg-neutral-400",
  };
  return map[props.proxy.status] ?? "bg-neutral-600 dark:bg-neutral-500";
});

const statusColor = computed((): any => {
  const map: Record<string, string> = {
    active: "success",
    error: "error",
    testing: "warning",
    banned: "error",
    inactive: "neutral",
  };
  return map[props.proxy.status] ?? "neutral";
});

// ── Type badge color ───────────────────────────────────────────
const typeBadgeColor = computed((): any => {
  const map: Record<string, string> = {
    residential: "success",
    mobile: "info",
    socks5: "warning",
    rotating: "primary",
    http: "neutral",
    https: "neutral",
    isp: "neutral",
  };
  return map[props.proxy.type] ?? "neutral";
});

// ── Response time ─────────────────────────────────────────────
const responseColor = computed(() => {
  const ms = props.proxy.responseTimeMs ?? 0;
  if (ms < 500) return "text-emerald-500 dark:text-emerald-400";
  if (ms < 1500) return "text-amber-500 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
});

const responseBarColor = computed(() => {
  const ms = props.proxy.responseTimeMs ?? 0;
  if (ms < 500) return "bg-emerald-500 dark:bg-emerald-400";
  if (ms < 1500) return "bg-amber-500 dark:bg-amber-400";
  return "bg-red-500 dark:bg-red-400";
});

const responseBarWidth = computed(() => {
  const ms = props.proxy.responseTimeMs ?? 0;
  const pct = Math.min(100, (ms / 3000) * 100);
  return `${pct}%`;
});

// ── Helpers ───────────────────────────────────────────────────
function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(c.charCodeAt(0) + 127397));
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}h ago`;
}
</script>

<template>
  <tr
    class="hover:bg-muted transition-colors group"
    :class="selected ? 'bg-primary/5' : ''"
  >
    <!-- Checkbox -->
    <td class="px-4 py-3.5 w-10">
      <UCheckbox
        :model-value="selected"
        @update:model-value="$emit('toggleSelect')"
        @click.stop
      />
    </td>
    <!-- Proxy host:port -->
    <td class="px-5 py-3.5">
      <div class="flex items-center gap-2.5">
        <div class="w-2 h-2 rounded-full shrink-0" :class="statusDot" />
        <div class="min-w-0">
          <p
            class="text-neutral-700 dark:text-neutral-200 font-mono text-sm font-medium"
          >
            {{ proxy.host }}
            <span class="text-neutral-500 dark:text-neutral-400"
              >:{{ proxy.port }}</span
            >
          </p>
          <p
            v-if="proxy.name"
            class="text-xs text-neutral-600 dark:text-neutral-400 truncate max-w-45"
          >
            {{ proxy.name }}
          </p>
          <p
            v-if="proxy.username"
            class="text-xs text-neutral-600 dark:text-neutral-400"
          >
            <UIcon name="i-heroicons-user" class="w-3 h-3 inline" />
            {{ proxy.username }}
          </p>
        </div>
      </div>
    </td>

    <!-- Type -->
    <td class="px-4 py-3.5">
      <UBadge
        :color="typeBadgeColor"
        variant="soft"
        size="xs"
        class="uppercase font-mono"
      >
        {{ proxy.type }}
      </UBadge>
    </td>

    <!-- GEO -->
    <td class="px-4 py-3.5">
      <div v-if="proxy.country" class="flex items-center gap-1.5">
        <span class="text-base leading-none">{{
          countryFlag(proxy.country)
        }}</span>
        <span class="text-xs text-muted">{{ proxy.country }}</span>
      </div>
      <span v-else class="text-neutral-600 dark:text-neutral-400 text-xs"
        >—</span
      >
    </td>

    <!-- Status -->
    <td class="px-4 py-3.5">
      <div class="space-y-1">
        <UBadge :color="statusColor" variant="soft" size="xs">
          {{ proxy.status }}
        </UBadge>
        <div v-if="proxy.isBlacklisted" class="flex items-center gap-1">
          <UIcon
            name="i-heroicons-shield-exclamation"
            class="w-3 h-3 text-error"
          />
          <span class="text-xs text-error">Blacklisted</span>
        </div>
      </div>
    </td>

    <!-- Response time -->
    <td class="px-4 py-3.5">
      <div v-if="proxy.responseTimeMs !== null" class="space-y-1">
        <span
          class="text-sm font-mono font-medium tabular-nums"
          :class="responseColor"
        >
          {{ proxy.responseTimeMs }}ms
        </span>
        <div class="w-16 h-1 bg-muted rounded-full overflow-hidden">
          <div
            class="h-full rounded-full"
            :class="responseBarColor"
            :style="{ width: responseBarWidth }"
          />
        </div>
      </div>
      <span v-else class="text-neutral-600 dark:text-neutral-400 text-xs"
        >Not tested</span
      >
    </td>

    <!-- Last tested -->
    <td class="px-4 py-3.5">
      <span v-if="proxy.lastTestedAt" class="text-xs text-muted">
        {{ timeAgo(proxy.lastTestedAt) }}
      </span>
      <span v-else class="text-xs text-neutral-600 dark:text-neutral-400"
        >—</span
      >
    </td>

    <!-- Actions -->
    <td class="px-4 py-3.5">
      <div
        class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <UTooltip text="Test proxy">
          <UButton
            icon="i-heroicons-signal"
            color="neutral"
            variant="ghost"
            size="xs"
            :loading="isActing"
            @click="$emit('test')"
          />
        </UTooltip>
        <UTooltip text="Hapus proxy">
          <UButton
            icon="i-heroicons-trash"
            color="error"
            variant="ghost"
            size="xs"
            class="text-white"
            :loading="isActing"
            @click="$emit('delete')"
          />
        </UTooltip>
      </div>
    </td>
  </tr>
</template>

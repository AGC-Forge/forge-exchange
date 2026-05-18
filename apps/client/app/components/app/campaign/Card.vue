<script setup lang="ts">
const props = defineProps<{
  campaign: CampaignModel;
  isActing?: boolean;
  selected?: boolean;
}>();

const emit = defineEmits<{
  (e: "start"): void;
  (e: "stop"): void;
  (e: "pause"): void;
  (e: "delete"): void;
  (e: "bulkDelete", ids: string[]): void;
  (e: "toggleSelect"): void;
}>();

const router = useRouter();

const statusCfg = computed(
  () => STATUS_CONFIG[props.campaign.status as CampaignStatus],
);
const canStart = computed(() =>
  ["draft", "paused", "completed"].includes(props.campaign.status),
);
const canPause = computed(() =>
  ["running", "queued"].includes(props.campaign.status),
);
const canStop = computed(() =>
  ["running", "queued", "paused"].includes(props.campaign.status),
);
const progressPct = computed(() => {
  if (!props.campaign.totalLimit) return 0;
  return Math.min(
    100,
    (props.campaign.totalSessions / props.campaign.totalLimit) * 100,
  );
});

const geoTargets = computed(
  () =>
    (props.campaign.geoTargets ?? []).filter(
      (target) => Boolean(target?.country),
    ) as Array<{
      country: string;
      proxySource?: "none" | "pool" | "integration" | null;
    }>,
);

const geoLabel = computed(() => {
  const targets = geoTargets.value;
  if (!targets.length) return "All GEO";
  if (targets.length === 1) return targets[0]?.country ?? "";
  return `${targets.length} countries`;
});

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

const geoSourceSummary = computed(() => {
  const targets = geoTargets.value;
  const counts = geoSourceCounts.value;

  if (!targets.length) return "No GEO filter";

  if (targets.length === 1) {
    return (
      {
        none: "No Proxy",
        pool: "Proxy Pool",
        integration: "Integration",
      }[targets[0]?.proxySource ?? "none"] ?? "No Proxy"
    );
  }

  if (counts.none === targets.length) return `${counts.none} no-proxy target`;
  if (counts.pool === targets.length) return `${counts.pool} proxy-pool target`;
  if (counts.integration === targets.length) {
    return `${counts.integration} integration target`;
  }

  const parts: string[] = [];
  if (counts.none) parts.push(`${counts.none} no-proxy`);
  if (counts.pool) parts.push(`${counts.pool} pool`);
  if (counts.integration) parts.push(`${counts.integration} integration`);

  return parts.join(" · ");
});

const hasNoProxyGeo = computed(() => geoSourceCounts.value.none > 0);

const deviceLabel = computed(() => {
  const map: Record<string, string> = {
    desktop: "Desktop",
    mobile: "Mobile",
    tablet: "Tablet",
    random: "Random",
  };
  return map[props.campaign.deviceType] ?? props.campaign.deviceType;
});

const menuItems = computed(() => [
  [
    {
      label: "Edit Campaign",
      icon: "i-heroicons-pencil",
      onSelect: () => router.push(`/app/campaigns/${props.campaign.id}/edit`),
    },
    {
      label: "See Analytics",
      icon: "i-heroicons-chart-bar",
      onSelect: () => router.push(`/app/campaigns/${props.campaign.id}`),
    },
  ],
  [
    {
      label: "Delete Campaign",
      icon: "i-heroicons-trash",
      color: "error" as const,
      onSelect: () => emit("delete"),
    },
  ],
]);
</script>

<template>
  <UPageCard
    spotlight
    spotlight-color="primary"
    :ui="{
      root: 'overflow-hidden overflow-x-auto shadow-md w-full',
      container:
        'shadow-md border border-primary/20 dark:border-primary/35 rounded-lg transition-all group' +
        (selected ? ' ring-2 ring-primary' : ''),
    }"
  >
    <div
      class="flex flex-col sm:flex-row sm:items-center gap-4"
      :class="selected ? 'opacity-90' : ''"
    >
      <!-- Checkbox -->
      <div class="shrink-0" @click.stop>
        <UCheckbox
          :model-value="selected"
          @update:model-value="$emit('toggleSelect')"
        />
      </div>
      <!-- Left: Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1.5 flex-wrap">
          <NuxtLink
            :to="`/app/campaigns/${campaign.id}`"
            class="font-semibold text-neutral-100 hover:text-indigo-400 transition-colors truncate"
          >
            {{ campaign.name }}
          </NuxtLink>
          <UBadge
            :color="statusCfg.color"
            variant="soft"
            :icon="statusCfg.icon"
            size="sm"
          >
            {{ statusCfg.label }}
          </UBadge>
        </div>

        <p class="text-xs text-muted truncate mb-3">
          {{ campaign.targetUrl }}
        </p>

        <!-- Meta chips -->
        <div class="flex flex-wrap gap-2">
          <span
            class="inline-flex items-center gap-1 text-xs text-muted bg-muted rounded-md px-2 py-1"
          >
            <UIcon name="i-heroicons-globe-alt" class="w-3.5 h-3.5" />
            {{ geoLabel }}
          </span>
          <span
            v-if="geoTargets.length > 0"
            class="inline-flex items-center gap-1 text-xs rounded-md px-2 py-1"
            :class="
              hasNoProxyGeo
                ? 'bg-amber-500/10 text-amber-300'
                : 'bg-secondary/10 text-muted'
            "
          >
            <UIcon
              :name="
                hasNoProxyGeo
                  ? 'i-heroicons-exclamation-triangle'
                  : 'i-heroicons-shield-check'
              "
              class="w-3.5 h-3.5"
            />
            {{ geoSourceSummary }}
          </span>
          <span
            class="inline-flex items-center gap-1 text-xs text-muted bg-muted rounded-md px-2 py-1"
          >
            <UIcon name="i-heroicons-device-phone-mobile" class="w-3.5 h-3.5" />
            {{ deviceLabel }}
          </span>
          <span
            class="inline-flex items-center gap-1 text-xs text-muted bg-muted rounded-md px-2 py-1"
          >
            <UIcon name="i-heroicons-bolt" class="w-3.5 h-3.5" />
            {{ campaign.speedMode }}
          </span>
          <span
            class="inline-flex items-center gap-1 text-xs text-muted bg-muted rounded-md px-2 py-1"
          >
            <UIcon name="i-heroicons-calendar-days" class="w-3.5 h-3.5" />
            {{ campaign.dailyLimit }}/day
          </span>
        </div>
      </div>

      <!-- Center: Stats -->
      <div class="flex gap-4 sm:gap-6 text-center">
        <div>
          <p class="text-lg font-bold text-white">
            {{ campaign.totalSessions.toLocaleString() }}
          </p>
          <p class="text-xs text-muted">Total</p>
        </div>
        <div>
          <p class="text-lg font-bold text-emerald-400 dark:text-emerald-50">
            {{ campaign.successCount.toLocaleString() }}
          </p>
          <p class="text-xs text-muted">Sukses</p>
        </div>
        <div>
          <p class="text-lg font-bold text-amber-400 dark:text-amber-500">
            {{ campaign.todayCount.toLocaleString() }}
          </p>
          <p class="text-xs text-muted">Today</p>
        </div>
      </div>

      <!-- Right: Actions -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- Start -->
        <UTooltip v-if="canStart" text="Start Campaign">
          <UButton
            icon="i-heroicons-play"
            color="success"
            variant="soft"
            size="sm"
            :loading="isActing"
            @click="$emit('start')"
          />
        </UTooltip>

        <!-- Pause -->
        <UTooltip v-if="canPause" text="Pause Campaign">
          <UButton
            icon="i-heroicons-pause"
            color="warning"
            variant="soft"
            size="sm"
            :loading="isActing"
            @click="$emit('pause')"
          />
        </UTooltip>

        <!-- Stop -->
        <UTooltip v-if="canStop" text="Stop Campaign">
          <UButton
            icon="i-heroicons-stop"
            color="error"
            variant="soft"
            size="sm"
            :loading="isActing"
            @click="$emit('stop')"
          />
        </UTooltip>

        <!-- More menu -->
        <UDropdownMenu :items="menuItems">
          <UButton
            icon="i-heroicons-ellipsis-vertical"
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </UDropdownMenu>
      </div>
    </div>

    <!-- Progress bar (running campaigns) -->
    <div
      v-if="campaign.status === 'running' && campaign.totalLimit"
      class="mt-4"
    >
      <div class="flex justify-between text-xs text-neutral-500 mb-1">
        <span>Progress</span>
        <span>{{ campaign.totalSessions }} / {{ campaign.totalLimit }}</span>
      </div>
      <div class="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          class="h-full bg-indigo-500 rounded-full transition-all"
          :style="{ width: progressPct + '%' }"
        />
      </div>
    </div>
  </UPageCard>
</template>

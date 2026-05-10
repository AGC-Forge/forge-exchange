<script setup lang="ts">
const props = defineProps<{
  campaign: CampaignModel;
  isActing?: boolean;
}>();

const emit = defineEmits<{
  start: [];
  stop: [];
  pause: [];
  delete: [];
}>();

const router = useRouter();

const statusCfg = computed(() => STATUS_CONFIG[props.campaign.status]);
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

const geoLabel = computed(() => {
  const targets = props.campaign.geoTargets;
  if (!targets || targets.length) return "All GEO";
  if (targets.length === 1) return targets?.[0]?.country ?? "";
  return `${targets.length} countries`;
});

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
      label: "Lihat Analytics",
      icon: "i-heroicons-chart-bar",
      onSelect: () => router.push(`/app/campaigns/${props.campaign.id}`),
    },
  ],
  [
    {
      label: "Hapus Campaign",
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
        'shadow-md border border-primary/20 dark:border-primary/35 rounded-lg transition-all group',
    }"
  >
    <div class="flex flex-col sm:flex-row sm:items-center gap-4">
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
      <div class="flex justify-between text-xs text-slate-500 mb-1">
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

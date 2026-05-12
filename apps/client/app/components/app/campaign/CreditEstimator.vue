<script setup lang="ts">
export interface CreditEstimate {
  base: number;
  geoBonus: number;
  stealthBonus: number;
  premiumBonus: number;
  total: number;
  perDay: number;
  perMonth: number;
}

const props = defineProps<{
  sessionMode: "standard" | "premium";
  provider?: string;
  hasGeoTargets: boolean;
  dailyLimit: number;
  currentBalance: number;
}>();

// ── Credit cost definitions ───────────────────────────────────
const PROVIDER_COST: Record<string, number> = {
  gologin: 4,
  adspower: 3,
  multilogin: 5,
  dolphin: 3,
  nstbrowser: 4,
};

// ── Computed estimate ─────────────────────────────────────────
const estimate = computed<CreditEstimate>(() => {
  const base = 1;
  const geoBonus = props.hasGeoTargets ? 1 : 0;
  const stealthBonus = 1; // always applied

  let premiumBonus = 0;
  if (props.sessionMode === "premium" && props.provider) {
    // Premium mode: total cost adalah provider cost (all-inclusive)
    // bukan base + bonus
    const providerCost = PROVIDER_COST[props.provider] ?? 4;
    const total = providerCost + geoBonus;
    return {
      base: providerCost,
      geoBonus,
      stealthBonus: 0, // sudah included di provider
      premiumBonus: 0,
      total,
      perDay: total * props.dailyLimit,
      perMonth: total * props.dailyLimit * 30,
    };
  }

  const total = base + geoBonus + stealthBonus + premiumBonus;

  return {
    base,
    geoBonus,
    stealthBonus,
    premiumBonus,
    total,
    perDay: total * props.dailyLimit,
    perMonth: total * props.dailyLimit * 30,
  };
});

// ── Balance sufficiency ───────────────────────────────────────
const daysCanRun = computed(() => {
  if (estimate.value.perDay === 0) return 0;
  return Math.floor(props.currentBalance / estimate.value.perDay);
});

const balanceStatus = computed(() => {
  if (daysCanRun.value >= 30) return "good";
  if (daysCanRun.value >= 7) return "ok";
  if (daysCanRun.value >= 1) return "low";
  return "insufficient";
});

const balanceColor = computed(() => {
  const map: Record<string, string> = {
    good: "text-emerald-500 dark:text-emerald-400",
    ok: "text-indigo-500 dark:text-indigo-400",
    low: "text-amber-500 dark:text-amber-400",
    insufficient: "text-red-500 dark:text-red-400",
  };
  return map[balanceStatus.value];
});

const balanceBarColor = computed(() => {
  const map: Record<string, string> = {
    good: "bg-emerald-500 dark:bg-emerald-400/5",
    ok: "bg-indigo-500 dark:bg-indigo-400/5",
    low: "bg-amber-500 dark:bg-amber-400/5",
    insufficient: "bg-red-500 dark:bg-red-400/5",
  };
  return map[balanceStatus.value];
});

const balanceBarWidth = computed(() => {
  const pct = Math.min(100, (daysCanRun.value / 30) * 100);
  return `${pct}%`;
});

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
</script>

<template>
  <div
    class="border rounded-xl overflow-hidden"
    :class="
      sessionMode === 'premium'
        ? 'border-purple-500/20 bg-purple-500/5'
        : 'border-indigo-500/20 bg-indigo-500/5'
    "
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 py-3 border-b"
      :class="
        sessionMode === 'premium'
          ? 'border-purple-500/15'
          : 'border-indigo-500/15'
      "
    >
      <div class="flex items-center gap-2">
        <UIcon
          name="i-heroicons-bolt"
          class="w-4 h-4"
          :class="
            sessionMode === 'premium'
              ? 'text-purple-500 dark:text-purple-400/5'
              : 'text-indigo-500 dark:text-indigo-400/5'
          "
        />
        <span class="text-sm font-semibold">Estimasi Credit</span>
      </div>

      <!-- Total cost pill -->
      <div
        class="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
        :class="
          sessionMode === 'premium'
            ? 'bg-purple-500/20 text-purple-300'
            : 'bg-indigo-500/20 text-indigo-300'
        "
      >
        {{ estimate.total }}
        <span class="font-normal text-xs opacity-70">credit/session</span>
      </div>
    </div>

    <!-- Breakdown -->
    <div class="px-4 py-3 space-y-2">
      <!-- Base cost -->
      <div class="flex items-center justify-between text-xs">
        <span class="text-muted flex items-center gap-1.5">
          <UIcon name="i-heroicons-cube" class="w-3.5 h-3.5" />
          {{
            sessionMode === "premium"
              ? `${provider ?? "Provider"} base`
              : "Base session"
          }}
        </span>
        <span class="font-mono font-medium">{{ estimate.base }}</span>
      </div>

      <!-- GEO bonus -->
      <div
        v-if="estimate.geoBonus > 0"
        class="flex items-center justify-between text-xs"
      >
        <span class="text-muted flex items-center gap-1.5">
          <UIcon name="i-heroicons-globe-alt" class="w-3.5 h-3.5" />
          GEO targeting
        </span>
        <span class="font-mono font-medium text-amber-400"
          >+{{ estimate.geoBonus }}</span
        >
      </div>

      <!-- Stealth bonus (standard only) -->
      <div
        v-if="sessionMode === 'standard' && estimate.stealthBonus > 0"
        class="flex items-center justify-between text-xs"
      >
        <span class="text-muted flex items-center gap-1.5">
          <UIcon name="i-heroicons-shield-check" class="w-3.5 h-3.5" />
          Stealth engine
        </span>
        <span class="font-mono font-medium text-emerald-400"
          >+{{ estimate.stealthBonus }}</span
        >
      </div>

      <!-- Divider + total -->
      <div
        class="border-t border-secondary/20 pt-2 flex items-center justify-between text-sm font-bold"
      >
        <span>Total per session</span>
        <span
          :class="
            sessionMode === 'premium' ? 'text-purple-300' : 'text-indigo-300'
          "
        >
          {{ estimate.total }} credit
        </span>
      </div>
    </div>

    <!-- Projection -->
    <div class="px-4 pb-4 space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <div class="bg-secondary/10 rounded-lg p-2.5 text-center">
          <p class="text-lg font-bold tabular-nums">
            {{ formatNumber(estimate.perDay) }}
          </p>
          <p class="text-xs text-muted">credit/day</p>
          <p class="text-xs text-muted opacity-70">
            ({{ dailyLimit }} sessions)
          </p>
        </div>
        <div class="bg-secondary/10 rounded-lg p-2.5 text-center">
          <p class="text-lg font-bold tabular-nums">
            {{ formatNumber(estimate.perMonth) }}
          </p>
          <p class="text-xs text-muted">credit/month</p>
          <p class="text-xs text-muted opacity-70">(est. 30 days)</p>
        </div>
      </div>

      <!-- Balance indicator -->
      <div class="space-y-1.5">
        <div class="flex items-center justify-between text-xs">
          <span class="text-muted">Your balance</span>
          <span :class="balanceColor" class="font-medium tabular-nums">
            {{ currentBalance.toLocaleString() }} credit
          </span>
        </div>

        <div class="h-1.5 bg-secondary/20 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="balanceBarColor"
            :style="{ width: balanceBarWidth }"
          />
        </div>

        <p class="text-xs" :class="balanceColor">
          <template v-if="balanceStatus === 'insufficient'">
            ⚠ Insufficient balance for day run
          </template>
          <template v-else-if="balanceStatus === 'low'">
            Enough for ~{{ daysCanRun }} days
          </template>
          <template v-else> Enough for ~{{ daysCanRun }} days </template>
        </p>
      </div>
    </div>
  </div>
</template>

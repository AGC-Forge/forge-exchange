<script setup lang="ts">
const props = defineProps<{
  plan: any;
  isCurrent: boolean;
  userCurrency?: 'IDR' | 'USD';
}>();

const toast = useToast();
const router = useRouter();
const config = useRuntimeConfig();

const IDR_TO_USD_RATE = 17500;
const currency = computed(() => props.userCurrency ?? 'IDR');

function formatPlanPrice(priceIdr: number): string {
  if (currency.value === 'USD') {
    const usd = Math.round((priceIdr / IDR_TO_USD_RATE) * 100) / 100;
    return `$${usd.toFixed(2)}`;
  }
  return `Rp ${(priceIdr / 1000).toFixed(0)}K`;
}

function getCurrencyPrefix(): string {
  return currency.value === 'USD' ? '$' : 'Rp';
}

const colorMap: Record<
  string,
  { icon: string; iconBg: string; iconColor: string; price: string }
> = {
  slate: {
    icon: "i-heroicons-user",
    iconBg: "bg-neutral-500/10 dark:bg-neutral-500/20",
    iconColor: "text-neutral-500 dark:text-neutral-400",
    price: "text-neutral-400 dark:text-neutral-300",
  },
  indigo: {
    icon: "i-heroicons-bolt",
    iconBg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    iconColor: "text-indigo-500 dark:text-indigo-400",
    price: "text-indigo-400 dark:text-indigo-300",
  },
  purple: {
    icon: "i-heroicons-rocket-launch",
    iconBg: "bg-purple-500/10 dark:bg-purple-500/20",
    iconColor: "text-purple-500 dark:text-purple-400",
    price: "text-purple-4000 dark:text-purple-300",
  },
  amber: {
    icon: "i-heroicons-building-office-2",
    iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
    iconColor: "text-amber-500 dark:text-amber-400",
    price: "text-amber-400 dark:text-amber-300",
  },
};

const cfg = computed(() => colorMap[props.plan.color] ?? colorMap.slate);
const planIcon = computed(() => cfg.value?.icon || "");
const iconBg = computed(() => cfg.value?.iconBg || "");
const iconColor = computed(() => cfg.value?.iconColor || "");
const priceColor = computed(() => cfg.value?.price || "");

function formatIdr(amount: number): string {
  return (amount / 1000).toFixed(0) + "K";
}
function handleSelect() {
  if (props.isCurrent) return;

  if (props.plan.id === "enterprise") {
    window.open(
      `mailto:${config.public.SALES_EMAIL}?subject=Enterprise Plan Inquiry`,
      "_blank",
    );
    return;
  }

  if (props.plan.id === "free") {
    // Downgrade ke free — tidak perlu payment, handle langsung
    toast.add({
      title: "Contact support",
      description: "Untuk downgrade to Free, contact our support.",
      color: "info",
    });
    return;
  }

  // Redirect ke checkout page dengan plan yang dipilih
  router.push(`/app/billing/checkout?plan=${props.plan.id}`);
}
</script>

<template>
  <div
    class="relative border rounded-xl p-5 flex flex-col gap-4 transition-all"
    :class="[
      isCurrent
        ? 'border-indigo-500/40 bg-indigo-500/8 shadow-[0_0_0_1px_rgba(99,102,241,0.2)]'
        : 'border-neutral-300 dark:border-neutral-600 bg-muted hover:border-neutral-400 dark:hover:border-neutral-500',
      plan.popular ? 'ring-1 ring-purple-500/30' : '',
    ]"
  >
    <!-- Popular badge -->
    <div
      v-if="plan.popular"
      class="absolute -top-3 left-1/2 -translate-x-1/2 bg-linear-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full"
    >
      Most Popular
    </div>

    <!-- Current badge -->
    <div v-if="isCurrent" class="absolute top-3 right-3">
      <UBadge color="success" variant="soft" size="xs" icon="i-heroicons-check">
        Active
      </UBadge>
    </div>

    <!-- Icon + name -->
    <div class="flex items-center gap-3">
      <div
        class="w-9 h-9 rounded-xl flex items-center justify-center"
        :class="iconBg"
      >
        <UIcon :name="planIcon" class="w-5 h-5" :class="iconColor" />
      </div>
      <div>
        <p class="font-semibold">{{ plan.name }}</p>
        <p v-if="isCurrent" class="text-xs text-muted">Plan aktif kamu</p>
      </div>
    </div>

    <!-- Price -->
    <div>
      <div
        v-if="plan.price === 0 && plan.id !== 'free'"
        class="text-lg font-bold"
      >
        Custom
      </div>
      <div v-else-if="plan.price === 0" class="text-lg font-bold text-muted">
        Gratis
      </div>
      <div v-else>
        <span class="text-2xl font-bold" :class="priceColor">
          {{ formatPlanPrice(plan.price) }}
        </span>
        <span class="text-xs text-muted">/bulan</span>
      </div>
      <p class="text-xs text-muted mt-0.5">
        {{
          plan.credits > 0
            ? plan.credits.toLocaleString() + " credits/bulan"
            : "Custom credits"
        }}
      </p>
    </div>

    <!-- Features -->
    <ul class="space-y-1.5 flex-1">
      <li
        v-for="f in plan.features"
        :key="f"
        class="flex items-center gap-2 text-xs text-muted"
      >
        <UIcon
          name="i-heroicons-check-circle"
          class="w-3.5 h-3.5 text-emerald-400 shrink-0"
        />
        {{ f }}
      </li>
    </ul>

    <!-- CTA -->
    <UButton
      :variant="isCurrent ? 'soft' : 'solid'"
      block
      :disabled="isCurrent || plan.id === 'free'"
      size="md"
      :class="
        isCurrent
          ? 'cursor-not-allowed'
          : plan.popular
            ? 'text-white bg-purple-500 dark:bg-purple-400'
            : 'text-white bg-primary'
      "
      @click="handleSelect"
    >
      <template v-if="isCurrent">
        <UIcon name="i-heroicons-check" class="w-4 h-4 mr-1" />
        Active Plan
      </template>
      <template v-else-if="plan.id === 'enterprise'"> Contact Sales </template>
      <template v-else> Select {{ plan.name }} </template>
    </UButton>
  </div>
</template>

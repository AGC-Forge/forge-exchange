<script setup lang="ts">
const props = defineProps<{
  plan: any;
  isCurrent: boolean;
}>();

const toast = useToast();

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
const planIcon = computed(() => cfg?.value?.icon || "");
const iconBg = computed(() => cfg?.value?.iconBg || "");
const iconColor = computed(() => cfg?.value?.iconColor || "");
const priceColor = computed(() => cfg?.value?.price || "");

function formatIdr(amount: number): string {
  return (amount / 1000).toFixed(0) + "K";
}

function handleSelect() {
  if (props.plan.id === "enterprise") {
    window.open("mailto:sales@trafficx.id?subject=Enterprise Plan", "_blank");
    return;
  }
  // TODO: redirect ke checkout plan
  toast.add({
    title: "Coming soon!",
    description: "Upgrade plan will be available soon.",
    color: "info",
    icon: "i-heroicons-information-circle",
  });
}
</script>

<template>
  <div
    class="relative border rounded-xl p-5 flex flex-col transition-all"
    :class="[
      isCurrent
        ? 'border-indigo-500/40 bg-indigo-500/8 shadow-[0_0_0_1px_rgba(99,102,241,0.2)]'
        : 'border-neutral-300 dark:border-neutral-600 bg-muted',
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

    <!-- Plan name -->
    <div class="mb-4">
      <div
        class="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
        :class="iconBg"
      >
        <UIcon :name="planIcon" class="w-4 h-4" :class="iconColor" />
      </div>
      <h3 class="font-bold text-base">{{ plan.name }}</h3>
      <p class="text-xs text-muted mt-0.5">
        {{
          plan.credits > 0
            ? `${plan.credits.toLocaleString()} credit/${plan.period}`
            : "Custom"
        }}
      </p>
    </div>

    <!-- Price -->
    <div class="mb-5">
      <template v-if="plan.price > 0">
        <div class="flex items-end gap-1">
          <span class="text-xs mb-0.5">Rp</span>
          <span class="text-3xl font-bold" :class="priceColor">
            {{ formatIdr(plan.price) }}
          </span>
          <span class="mb-0.5">/month</span>
        </div>
      </template>
      <template v-else-if="plan.id === 'free'">
        <span class="text-3xl font-bold">Free</span>
      </template>
      <template v-else>
        <span class="text-2xl font-bold text-amber-600 dark:text-amber-500"
          >Custom</span
        >
        <p class="text-xs text-muted mt-0.5">Contact sales</p>
      </template>
    </div>

    <!-- Features -->
    <ul class="space-y-2 flex-1 mb-5">
      <li
        v-for="feature in plan.features"
        :key="feature"
        class="flex items-center gap-2 text-sm"
      >
        <UIcon
          name="i-heroicons-check"
          class="w-4 h-4 shrink-0"
          :class="iconColor"
        />
        <span>{{ feature }}</span>
      </li>
    </ul>

    <!-- CTA -->
    <UButton
      :variant="isCurrent ? 'outline' : 'solid'"
      :color="isCurrent ? 'neutral' : 'primary'"
      block
      :disabled="isCurrent || plan.id === 'free'"
      size="md"
      :class="
        isCurrent
          ? 'text-primary border border-primary cursor-not-allowed'
          : 'text-white'
      "
      @click="handleSelect"
    >
      {{
        isCurrent
          ? "Active Plan"
          : plan.id === "enterprise"
            ? "Contact Us"
            : "Select Plan"
      }}
    </UButton>
  </div>
</template>

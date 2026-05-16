<script setup lang="ts">
definePageMeta({ layout: false, middleware: "auth" });

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { user } = useUserSession();
const config = useRuntimeConfig();

const planId = computed(() => (route.query.plan as string) ?? "");
const plan = computed(() =>
  SUBSCRIPTION_PLANS.find((p) => p.id === planId.value),
);

watch(
  planId,
  (id) => {
    if (id === "enterprise") {
      window.open(
        `mailto:${config.public.SALES_EMAIL}?subject=Enterprise Plan`,
        "_blank",
      );
      router.back();
    }
    if (id === "free") {
      router.push("/app/billing");
    }
  },
  { immediate: true },
);

const { data: subData } = await useFetch("/api/billing/subscription", {
  default: () => ({ data: { subscription: null } }),
});
const currentPlan = computed(
  () => subData.value?.data?.subscription?.plan ?? "free",
);
const isCurrentPlan = computed(() => currentPlan.value === planId.value);
const isDowngrade = computed(() => {
  const order = ["free", "starter", "pro", "enterprise"];
  return order.indexOf(planId.value) < order.indexOf(currentPlan.value);
});

const gateway = ref<"midtrans" | "xendit" | "paypal">("midtrans");
const gateways = [
  {
    id: "midtrans",
    name: "Midtrans",
    icon: "🇮🇩",
    desc: "Transfer bank, GoPay, OVO, dll",
  },
  { id: "xendit", name: "Xendit", icon: "⚡", desc: "VA, e-wallet, QRIS" },
  { id: "paypal", name: "PayPal", icon: "💳", desc: "PayPal, Credit Card" },
];

const billingCycle = ref<"monthly" | "yearly">("monthly");
const yearlyDiscount = 0.2; // 20% off
const finalPrice = computed(() => {
  if (!plan.value) return 0;
  const base = plan.value.price;
  return billingCycle.value === "yearly"
    ? Math.round(base * 12 * (1 - yearlyDiscount))
    : base;
});
const finalCredits = computed(() => {
  if (!plan.value) return 0;
  return billingCycle.value === "yearly"
    ? plan.value.credits * 12
    : plan.value.credits;
});
const pricePerMonth = computed(() => {
  if (billingCycle.value === "yearly" && plan.value) {
    return Math.round(plan.value.price * (1 - yearlyDiscount));
  }
  return plan.value?.price ?? 0;
});

const isSubmitting = ref(false);

async function handleSubscribe() {
  if (!plan.value || isCurrentPlan.value) return;
  isSubmitting.value = true;
  try {
    const res = await $fetch<any>("/api/billing/subscribe", {
      method: "POST",
      body: {
        planId: planId.value,
        gateway: gateway.value,
        billingCycle: billingCycle.value,
      },
    });
    // Redirect ke payment gateway
    if (res.data?.paymentUrl) {
      window.location.href = res.data.paymentUrl;
    } else {
      toast.add({
        title: "Success!",
        description: res.message,
        color: "success",
      });
      router.push("/app/billing?status=success");
    }
  } catch (err: any) {
    toast.add({
      title: "Failed to create order",
      description:
        err?.data?.error?.message ?? err?.message ?? "Please try again later",
      color: "error",
    });
  } finally {
    isSubmitting.value = false;
  }
}

function formatIdr(n: number) {
  return n.toLocaleString("id-ID");
}

const planColorClass: Record<string, string> = {
  indigo: "text-indigo-500 dark:text-indigo-400",
  purple: "text-purple-500 dark:text-purple-400",
  amber: "text-amber-500 dark:text-amber-400",
};
const planBgClass: Record<string, string> = {
  indigo: "bg-indigo-500/10 border-indigo-500/30 text-white",
  purple: "bg-purple-500/10 border-purple-500/30 text-white",
  amber: "bg-amber-500/10 border-amber-500/30 text-white",
};
</script>

<template>
  <div class="min-h-screen p-6">
    <div class="mx-auto max-w-2xl space-y-6">
      <!-- Header -->
      <div class="flex items-center gap-3">
        <UButton
          to="/app/billing"
          icon="i-heroicons-arrow-left"
          variant="ghost"
          color="neutral"
          size="sm"
        />
        <div>
          <h1 class="text-xl font-bold">Checkout</h1>
          <p class="text-sm text-muted">Upgrade to plan {{ plan?.name }}</p>
        </div>
      </div>

      <!-- Plan not found -->
      <div v-if="!plan" class="text-center py-16">
        <UIcon
          name="i-heroicons-exclamation-circle"
          class="w-10 h-10 text-muted mx-auto mb-3"
        />
        <p class="text-sm font-medium">Plan not found</p>
        <UButton
          to="/app/billing"
          variant="soft"
          color="neutral"
          size="sm"
          class="mt-3"
        >
          Back
        </UButton>
      </div>

      <template v-else>
        <!-- Already current plan warning -->
        <UAlert
          v-if="isCurrentPlan"
          color="info"
          variant="soft"
          icon="i-heroicons-information-circle"
          title="This is your current plan"
          description="You have subscribed to this plan already."
        />

        <!-- Downgrade warning -->
        <UAlert
          v-else-if="isDowngrade"
          color="warning"
          variant="soft"
          icon="i-heroicons-exclamation-triangle"
          title="This is downgrade"
          description="The selected plan has fewer features."
        />

        <!-- Plan summary card -->
        <div
          class="border rounded-xl p-6 space-y-5 shadow-md"
          :class="planBgClass[plan.color]"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center"
              :class="`bg-${plan.color}-500/20`"
            >
              <UIcon
                :name="plan.icon"
                class="w-5 h-5"
                :class="planColorClass[plan.color]"
              />
            </div>
            <div>
              <h2 class="font-bold text-lg text-default">{{ plan.name }}</h2>
              <p class="text-xs text-muted">Subscription Plan</p>
            </div>
            <UBadge
              v-if="plan.popular"
              variant="soft"
              size="xs"
              class="ml-auto bg-purple-500 dark:bg-purple-400 text-white"
            >
              Most Popular
            </UBadge>
          </div>

          <!-- Features -->
          <ul class="space-y-2">
            <li
              v-for="f in plan.features"
              :key="f"
              class="flex items-center gap-2 text-sm font-semibold"
            >
              <UIcon
                name="i-heroicons-check-circle"
                class="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-600"
              />
              <span class="text-default"> {{ f }}</span>
            </li>
          </ul>

          <!-- Billing cycle toggle -->
          <div class="border border-secondary/20 rounded-lg p-4 space-y-3">
            <p class="text-xs font-medium text-muted uppercase tracking-wide">
              Billing Cycle
            </p>
            <div class="flex gap-3">
              <button
                v-for="cycle in ['monthly', 'yearly']"
                :key="cycle"
                class="flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all cursor-pointer active:scale-x-95"
                :class="
                  billingCycle === cycle
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-secondary/20 text-muted hover:border-secondary/40'
                "
                @click="billingCycle = cycle as 'monthly' | 'yearly'"
              >
                <span class="capitalize">{{ cycle }}</span>
                <span
                  v-if="cycle === 'yearly'"
                  class="ml-1.5 text-xs font-normal text-emerald-400"
                >
                  Save 20%
                </span>
              </button>
            </div>

            <!-- Price breakdown -->
            <div class="space-y-1.5 pt-1">
              <div class="flex items-baseline justify-between">
                <span class="text-sm text-muted font-medium">
                  Rp {{ formatIdr(pricePerMonth) }} / month
                </span>
                <span
                  v-if="billingCycle === 'yearly'"
                  class="text-xs text-muted line-through font-medium"
                >
                  Rp {{ formatIdr(plan.price) }} / year
                </span>
              </div>
              <div class="flex items-baseline justify-between">
                <span class="text-sm font-bold text-default">
                  Rp {{ formatIdr(finalPrice) }}
                </span>
                <span class="text-xs text-muted font-medium">
                  {{ billingCycle === "yearly" ? "per year" : "per month" }}
                </span>
              </div>
              <div
                class="flex items-center gap-1 text-xs text-indigo-400 font-semibold"
              >
                <UIcon name="i-heroicons-bolt" class="w-3.5 h-3.5" />
                {{ finalCredits.toLocaleString() }} credits
                {{ billingCycle === "yearly" ? "(12 months)" : "/month" }}
              </div>
            </div>
          </div>
        </div>

        <!-- Payment gateway -->
        <div
          class="border border-secondary/20 rounded-xl p-5 space-y-3 shadow-md"
        >
          <p class="text-sm font-semibold">Payment Gateway</p>
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="gw in gateways"
              :key="gw.id"
              class="flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all"
              :class="
                gateway === gw.id
                  ? 'border-primary bg-primary/10'
                  : 'border-secondary/20 hover:border-secondary/40'
              "
              @click="gateway = gw.id as 'midtrans' | 'xendit' | 'paypal'"
            >
              <span class="text-2xl shrink-0">{{ gw.icon }}</span>
              <div>
                <p class="text-sm font-medium">{{ gw.name }}</p>
                <p class="text-xs text-muted">{{ gw.desc }}</p>
              </div>
              <UIcon
                v-if="gateway === gw.id"
                name="i-heroicons-check-circle"
                class="w-4 h-4 text-primary ml-auto shrink-0 mt-0.5"
              />
            </button>
          </div>
        </div>

        <!-- Order summary -->
        <div
          class="border border-secondary/20 rounded-xl p-5 space-y-3 bg-secondary/5 shadow-md"
        >
          <p class="text-sm font-semibold">Order Summary</p>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-muted">Plan</span>
              <span class="font-medium">
                {{ plan.name }} ({{ billingCycle }})
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Credits</span>
              <span class="font-medium">
                {{ finalCredits.toLocaleString() }} credits
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Gateway</span>
              <span class="font-medium capitalize">{{ gateway }}</span>
            </div>
            <div
              v-if="billingCycle === 'yearly'"
              class="flex justify-between text-emerald-400"
            >
              <span>Discount 20%</span>
              <span>- Rp {{ formatIdr(plan.price * 12 - finalPrice) }}</span>
            </div>
            <div
              class="border-t border-secondary/20 pt-2 flex justify-between font-bold text-base"
            >
              <span>Total</span>
              <span>Rp {{ formatIdr(finalPrice) }}</span>
            </div>
          </div>
        </div>

        <!-- CTA -->
        <div class="flex gap-3">
          <UButton
            to="/app/billing"
            variant="solid"
            color="error"
            icon="material-symbols:close"
            class="flex-1 text-white"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            class="flex-1 text-white"
            icon="i-heroicons-credit-card"
            size="lg"
            :loading="isSubmitting"
            :disabled="isCurrentPlan || finalPrice === 0"
            @click="handleSubscribe"
          >
            Pay Rp {{ formatIdr(finalPrice) }}
          </UButton>
        </div>

        <p class="text-xs text-muted text-center">
          By continuing, you agree to our
          <ULink to="/terms" class="underline">Terms of Service</ULink>
          and
          <ULink to="/privacy" class="underline">Privacy Policy</ULink>
          our.
        </p>
      </template>
    </div>
  </div>
</template>

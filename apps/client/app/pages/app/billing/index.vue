<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Workers",
  description: "Manage your workers.",
  robots: "noindex, nofollow",
});

const {
  subscription,
  packages,
  plans,
  creditLogs,
  logMeta,
  transactions,
  txMeta,
  isLoading,
  isTopingUp,
  fetchSubscription,
  fetchCreditLogs,
  fetchTransactions,
  createTopUp,
} = useBilling();

const route = useRoute();

// Payment status dari query string redirect
const paymentStatus = computed(() => route.query.status as string | undefined);

// ── Topup form state ──────────────────────────────────────────
const selectedPackage = ref<any>(null);
const customAmount = ref<number | null>(null);
const selectedGateway = ref<"midtrans" | "xendit">("midtrans");

const gateways = [
  { id: "midtrans", name: "Midtrans", icon: "🇮🇩" },
  { id: "xendit", name: "Xendit", icon: "⚡" },
];

// ── Tabs ──────────────────────────────────────────────────────
const activeTab = ref("transactions");
const tabs = [
  {
    id: "transactions",
    label: "Topup History",
    icon: "i-heroicons-receipt-refund",
  },
  { id: "history", label: "Credit History", icon: "i-heroicons-clock" },
];

const logPage = ref(1);
const txPage = ref(1);
const logFilter = ref("");
const logFilters = [
  { label: "All", value: "all" },
  { label: "Debit", value: "debit" },
  { label: "Credit", value: "credit" },
  { label: "Refund", value: "refund" },
  { label: "Bonus", value: "bonus" },
];

function setLogFilter(f: string) {
  logFilter.value = f;
  logPage.value = 1;
  fetchCreditLogs({ page: 1, type: f || undefined });
}

// ── Computed ──────────────────────────────────────────────────
const creditBalance = computed(() => subscription.value?.creditBalance ?? 0);
const totalTx = ref(0);

const finalAmount = computed(
  () => selectedPackage.value?.priceIdr ?? customAmount.value ?? 0,
);

const finalCredits = computed(() => {
  if (selectedPackage.value) {
    return selectedPackage.value.credits + (selectedPackage.value.bonus ?? 0);
  }
  if (customAmount.value && customAmount.value >= 10000) {
    return Math.floor(customAmount.value / 5);
  }
  return 0;
});

const calculatedCredits = computed(() =>
  customAmount.value && customAmount.value >= 10000
    ? Math.floor(customAmount.value / 5)
    : 0,
);

const planColor = computed((): any => {
  const map: Record<string, string> = {
    free: "neutral",
    starter: "primary",
    pro: "success",
    enterprise: "warning",
  };
  return map[subscription.value?.plan ?? "free"] ?? "neutral";
});

// ── Actions ───────────────────────────────────────────────────
function selectPackage(pkg: any) {
  selectedPackage.value = pkg;
  customAmount.value = null;
}

async function handleTopUp() {
  if (finalAmount.value < 10000) return;
  const paymentUrl = await createTopUp(
    finalAmount.value,
    selectedGateway.value,
  );
  if (paymentUrl) window.open(paymentUrl, "_blank");
}

// ── Helpers ───────────────────────────────────────────────────
function formatIdr(amount: number): string {
  return amount.toLocaleString("id-ID");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function txStatusColor(status: string): any {
  const map: Record<string, string> = {
    paid: "success",
    pending: "warning",
    failed: "error",
    expired: "neutral",
    refunded: "info",
  };
  return map[status] ?? "neutral";
}

function logTypeColor(type: string): any {
  const map: Record<string, string> = {
    debit: "error",
    credit: "success",
    refund: "warning",
    bonus: "info",
  };
  return map[type] ?? "neutral";
}

// ── Init ──────────────────────────────────────────────────────
onMounted(async () => {
  await fetchSubscription();
  await Promise.all([
    fetchTransactions({ page: 1 }),
    fetchCreditLogs({ page: 1 }),
  ]);
  totalTx.value = txMeta.value.total;
});
</script>

<template>
  <AppDashboardLayout id="billing" title="Billing">
    <template #content>
      <div class="min-h-screen p-6">
        <div class="mx-auto max-w-7xl space-y-6">
          <!-- Header -->
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold tracking-tight">Billing</h1>
              <p class="text-sm text-muted mt-0.5">
                Manage your credits and subscriptions
              </p>
            </div>
          </div>

          <!-- Success/failed alert dari redirect payment -->
          <UAlert
            v-if="paymentStatus === 'success'"
            color="success"
            variant="soft"
            icon="i-heroicons-check-circle"
            title="Payment successful!"
            description="Credit added successfully!"
          />
          <UAlert
            v-if="paymentStatus === 'failed'"
            color="error"
            variant="soft"
            icon="i-heroicons-x-circle"
            title="Payment failed"
            description="Transaction failed."
          />
        </div>
      </div>
    </template>
  </AppDashboardLayout>
</template>

<style scoped></style>

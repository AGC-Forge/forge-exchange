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

          <!-- Credit balance card -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <!-- Balance -->
            <div
              class="lg:col-span-2 bg-linear-to-br from-indigo-600/40 via-purple-600/20 to-transparent dark:from-indigo-600/20 dark:via-purple-600/10 dark:to-transparent border border-neutral-300 dark:border-neutral-600 rounded-2xl p-6 relative overflow-hidden"
            >
              <div
                class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_60%)]"
              />
              <div class="relative">
                <div class="flex items-start justify-between mb-4">
                  <div>
                    <p
                      class="text-xs font-medium uppercase tracking-wider text-neutral-900 dark:text-indigo-300/70"
                    >
                      Credit Balance
                    </p>
                    <div class="flex items-end gap-2 mt-1">
                      <span class="text-5xl font-boldtracking-tight">
                        {{ isLoading ? "—" : creditBalance.toLocaleString() }}
                      </span>
                      <span class="text-muted mb-1">credits</span>
                    </div>
                  </div>
                  <div class="flex flex-col items-end gap-1.5">
                    <UBadge
                      :color="planColor"
                      variant="solid"
                      size="md"
                      class="uppercase font-bold tracking-wide"
                    >
                      {{ subscription?.plan ?? "Free" }}
                    </UBadge>
                    <span
                      v-if="subscription?.expiredAt"
                      class="text-xs text-error"
                    >
                      Exp: {{ formatDate(subscription.expiredAt) }}
                    </span>
                  </div>
                </div>

                <!-- Balance bar -->
                <div class="space-y-1.5">
                  <div class="flex justify-between text-xs font-semibold">
                    <span class="text-muted">Used today</span>
                    <span class="text-muted">
                      {{
                        (subscription?.creditUsedToday ?? 0).toLocaleString()
                      }}
                      credits
                    </span>
                  </div>
                  <div
                    class="h-2 bg-white dark:bg-neutral-700 rounded-full overflow-hidden"
                  >
                    <div
                      class="h-full bg-linear-to-r from-indigo-400 to-purple-400 rounded-full transition-all duration-700"
                      :style="{
                        width: `${Math.min(100, ((subscription?.creditUsedToday ?? 0) / Math.max(subscription?.creditLimit ?? 100, 1)) * 100)}%`,
                      }"
                    />
                  </div>
                  <div class="flex justify-between text-xs text-muted">
                    <span>0</span>
                    <span
                      >{{
                        (subscription?.creditLimit ?? 100).toLocaleString()
                      }}
                      limit</span
                    >
                  </div>
                </div>
              </div>
            </div>
            <!-- Quick stats -->
            <div class="space-y-3">
              <AppDashboardStatsCard
                label="Total Credit Used"
                :value="(subscription?.creditUsed ?? 0).toLocaleString()"
                icon="i-heroicons-bolt"
                color="indigo"
                format="compact"
                :loading="isLoading"
              />
              <AppDashboardStatsCard
                label="Total Transactions"
                :value="totalTx"
                icon="i-heroicons-credit-card"
                color="emerald"
                format="compact"
                :loading="isLoading"
              />
              <AppDashboardStatsCard
                label="Plan Active Since"
                :value="
                  subscription?.startedAt
                    ? formatDate(subscription.startedAt)
                    : '—'
                "
                icon="i-heroicons-calendar"
                color="blue"
                format="compact"
                :loading="isLoading"
              />
            </div>
          </div>

          <!-- Topup section -->
          <div class="bg-muted border border-muted rounded-xl overflow-hidden">
            <div class="px-5 py-4 border-b border-muted">
              <h3 class="text-sm font-semibold">Top Up Credit</h3>
              <p class="text-xs text-muted mt-0.5">
                Select a package or enter a custom quantity
              </p>
            </div>

            <div class="p-5 space-y-5">
              <!-- Credit packages -->
              <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  v-for="pkg in packages"
                  :key="pkg.id"
                  class="relative border rounded-xl p-4 text-left transition-all cursor-pointer active:scale-95"
                  :class="
                    selectedPackage?.id === pkg.id
                      ? 'border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.3)]'
                      : 'border-neutral-300 dark:border-neutral-600 bg-muted border'
                  "
                  @click="selectPackage(pkg)"
                >
                  <!-- Popular tag -->
                  <span
                    v-if="pkg.bonus > 0"
                    class="absolute -top-2 left-3 text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-medium"
                  >
                    +{{ pkg.bonus.toLocaleString() }} bonus
                  </span>
                  <p
                    class="text-sm font-bold text-neutral-600 dark:text-neutral-300 mt-1"
                  >
                    {{ pkg.label }}
                  </p>
                  <p
                    class="text-2xl font-bold mt-2"
                    :class="
                      selectedPackage?.id === pkg.id
                        ? 'text-indigo-500 dark:text-indigo-400'
                        : 'text-neutral-700 dark:text-neutral-200'
                    "
                  >
                    Rp {{ formatIdr(pkg.priceIdr) }}
                  </p>
                  <p class="text-xs mt-1 text-primary-500">
                    {{ pkg.credits.toLocaleString() }} credits
                  </p>
                </button>
              </div>

              <!-- Custom amount -->
              <div class="space-y-2">
                <p class="text-xs uppercase tracking-wide font-medium">
                  Or enter a custom amount
                </p>
                <div class="flex gap-3 flex-col sm:flex-row">
                  <div class="relative flex-1">
                    <span
                      class="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                    >
                      Rp
                    </span>
                    <UInput
                      v-model.number="customAmount"
                      type="number"
                      :min="10000"
                      :step="10000"
                      placeholder="50000"
                      class="w-full pl-9"
                      size="lg"
                      @focus="selectedPackage = null"
                    />
                  </div>
                  <div class="flex items-center gap-1.5 text-sm px-2">
                    <UIcon name="i-heroicons-arrow-right" class="w-4 h-4" />
                    <span class="tabular-nums">
                      {{ calculatedCredits.toLocaleString() }} credits
                    </span>
                  </div>
                </div>
              </div>

              <!-- Gateway selector -->
              <div class="space-y-2">
                <p class="text-xs uppercase tracking-wide font-medium">
                  Payment Methods
                </p>
                <div class="flex gap-3 flex-wrap">
                  <button
                    v-for="gw in gateways"
                    :key="gw.id"
                    class="flex items-center gap-2.5 px-4 py-2.5 border rounded-xl transition-all text-sm font-medium cursor-pointer active:scale-95"
                    :class="
                      selectedGateway === gw.id
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                        : 'border text-muted border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500'
                    "
                    @click="selectedGateway = gw.id as 'midtrans' | 'xendit'"
                  >
                    <span class="text-base">{{ gw.icon }}</span>
                    {{ gw.name }}
                  </button>
                </div>
              </div>

              <!-- Summary + CTA -->
              <div
                class="flex items-center justify-between p-4 bg-muted border border-neutral-300 dark:border-neutral-600 rounded-xl"
              >
                <div>
                  <p class="text-sm text-primary">You will get</p>
                  <p
                    class="text-xl font-bold text-indigo-500 dark:text-indigo-400 mt-0.5"
                  >
                    {{ finalCredits.toLocaleString() }} credits
                  </p>
                  <p class="text-xs text-muted">
                    Rp {{ formatIdr(finalAmount) }}
                  </p>
                </div>
                <UButton
                  size="lg"
                  icon="i-heroicons-credit-card"
                  :loading="isTopingUp"
                  :disabled="finalAmount < 10000"
                  color="primary"
                  class="text-white"
                  @click="handleTopUp"
                >
                  Pay Now
                </UButton>
              </div>
            </div>
          </div>

          <!-- Subscription plans -->
          <div class="bg-muted border border-muted rounded-xl overflow-hidden">
            <div class="px-5 py-4 border-b border-muted">
              <h3 class="text-sm font-semibold">Subscription Plans</h3>
              <p class="text-xs text-muted mt-0.5">
                Upgrade for more credits and features
              </p>
            </div>
            <div
              class="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <AppBillingPlanCard
                v-for="plan in plans"
                :key="plan.id"
                :plan="plan"
                :is-current="subscription?.plan === plan.id"
              />
            </div>
          </div>

          <!-- Tabs: Transactions + Credit history -->
          <div class="bg-muted border border-muted rounded-xl overflow-hidden">
            <div class="flex border-b border-muted">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                class="flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors cursor-pointer active:scale-95"
                :class="
                  activeTab === tab.id
                    ? 'border-indigo-500 dark:border-indigo-400 text-indigo-500 dark:text-indigo-400'
                    : 'border-transparent'
                "
                @click="activeTab = tab.id"
              >
                <UIcon :name="tab.icon" class="w-4 h-4" />
                {{ tab.label }}
              </button>
            </div>

            <!-- Transactions tab -->
            <div v-if="activeTab === 'transactions'" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-muted">
                    <th
                      class="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Tanggal
                    </th>
                    <th
                      class="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Gateway
                    </th>
                    <th
                      class="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Jumlah
                    </th>
                    <th
                      class="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Credits
                    </th>
                    <th
                      class="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-muted">
                  <tr v-if="transactions.length === 0">
                    <td
                      colspan="5"
                      class="text-center py-10 text-sm text-muted"
                    >
                      Belum ada transaksi
                    </td>
                  </tr>
                  <tr
                    v-else
                    v-for="tx in transactions"
                    :key="tx.id"
                    class="hover:bg-muted"
                  >
                    <td class="px-5 py-3.5">
                      <p class="text-xs">
                        {{ formatDateTime(tx.createdAt) }}
                      </p>
                      <p v-if="tx.paidAt" class="text-xs text-muted">
                        Dibayar: {{ formatDateTime(tx.paidAt) }}
                      </p>
                    </td>
                    <td class="px-4 py-3.5">
                      <span class="text-xs font-medium capitalize">{{
                        tx.gateway
                      }}</span>
                    </td>
                    <td class="px-4 py-3.5 text-right">
                      <span class="font-medium"
                        >Rp {{ formatIdr(tx.amountIdr) }}</span
                      >
                    </td>
                    <td class="px-4 py-3.5 text-right">
                      <span class="text-indigo-400 font-medium tabular-nums">
                        +{{ tx.creditsPurchased.toLocaleString() }}
                      </span>
                    </td>
                    <td class="px-4 py-3.5">
                      <UBadge
                        :color="txStatusColor(tx.status)"
                        variant="soft"
                        size="xs"
                      >
                        {{ tx.status }}
                      </UBadge>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div
                v-if="txMeta.totalPages > 1"
                class="flex justify-center py-4 border-t border-muted"
              >
                <UPagination
                  v-model:page="txPage"
                  :total="txMeta.total"
                  :items-per-page="txMeta.limit"
                  @update:page="(p) => fetchTransactions({ page: p })"
                />
              </div>
            </div>

            <!-- Credit history tab -->
            <div v-else-if="activeTab === 'history'" class="overflow-x-auto">
              <!-- Filter -->
              <div class="px-5 py-3 border-b border-muted flex gap-2">
                <button
                  v-for="f in logFilters"
                  :key="f.value"
                  class="text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer active:scale-95"
                  :class="
                    logFilter === f.value
                      ? 'bg-indigo-500/20 dark:bg-indigo-400/20 text-indigo-400 dark:text-indigo-300 border border-indigo-500/30 dark:border-indigo-400/30'
                      : 'text-muted'
                  "
                  @click="setLogFilter(f.value)"
                >
                  {{ f.label }}
                </button>
              </div>

              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-muted">
                    <th
                      class="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Time
                    </th>
                    <th
                      class="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Description
                    </th>
                    <th
                      class="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Source
                    </th>
                    <th
                      class="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Amount
                    </th>
                    <th
                      class="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-muted">
                  <tr v-if="creditLogs.length === 0">
                    <td
                      colspan="5"
                      class="text-center py-10 text-sm text-muted"
                    >
                      No credit history
                    </td>
                  </tr>
                  <tr
                    v-else
                    v-for="log in creditLogs"
                    :key="log.id"
                    class="bg-muted"
                  >
                    <td class="px-5 py-3">
                      <span class="text-xs text-muted">{{
                        formatDateTime(log.createdAt)
                      }}</span>
                    </td>
                    <td class="px-4 py-3">
                      <span class="text-sm">{{ log.description ?? "—" }}</span>
                    </td>
                    <td class="px-4 py-3">
                      <UBadge
                        :color="logTypeColor(log.type)"
                        variant="soft"
                        size="xs"
                      >
                        {{ log.source }}
                      </UBadge>
                    </td>
                    <td class="px-4 py-3 text-right">
                      <span
                        class="font-medium tabular-nums font-mono"
                        :class="
                          log.type === 'debit'
                            ? 'text-red-500 dark:text-red-400'
                            : 'text-emerald-500 dark:text-emerald-400'
                        "
                      >
                        {{ log.type === "debit" ? "-" : "+"
                        }}{{ log.amount.toLocaleString() }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right">
                      <span class="text-muted tabular-nums text-xs">
                        {{ log.balanceAfter.toLocaleString() }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div
                v-if="logMeta.totalPages > 1"
                class="flex justify-center py-4 border-t border-muted"
              >
                <UPagination
                  v-model:page="logPage"
                  :total="logMeta.total"
                  :items-per-page="logMeta.limit"
                  @update:page="
                    (p) =>
                      fetchCreditLogs({ page: p, type: logFilter || undefined })
                  "
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </AppDashboardLayout>
</template>

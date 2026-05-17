<script lang="ts" setup>
import type { TabsItem, SelectItem } from "@nuxt/ui";
import type { TopUpTransaction, Subscription, User } from "@forge-exchange/db";
import type { TransactionTab } from "~/composables/useTransactions";

definePageMeta({
  layout: "auth",
  middleware: "admin",
});
useSeoMeta({
  title: "Transactions",
  description: "Manage your transactions.",
  robots: "noindex, nofollow",
});

interface TopUpTransactionWithUser extends TopUpTransaction {
  user: User;
}
interface SubscriptionWithUser extends Subscription {
  user: User;
}

const toast = useToast();

// ── State ──────────────────────────────────────────────────────
const search = ref("");
const orderBy = ref("createdAt");
const currentPage = ref(1);
const filterStatus = ref("all");
const filterGateway = ref("all");
const filterPlan = ref("all");
const filterActive = ref<"active" | "inactive" | "all">("all");
const showDeleteModal = ref(false);
const showBulkDeleteModal = ref(false);
const dataTopUpDelete = ref<TopUpTransactionWithUser | null>(null);
const dataSubscriptionDelete = ref<SubscriptionWithUser | null>(null);
const dataIdsDelete = ref<string[]>([]);

// Tab index (0 = topUp, 1 = subscription)
const selectedTabIndex = ref(0);

// Tabs items
const items = [
  {
    label: "Top Up",
    description: "Manage User Top Up.",
    icon: "i-lucide-credit-card",
    slot: "topUp" as const,
  },
  {
    label: "Subscription",
    description: "Manage User Subscription.",
    icon: "streamline-flex:subscription-cashflow-solid",
    slot: "subscription" as const,
  },
] satisfies TabsItem[];

// Derived tab type
const selectedTab = computed<TransactionTab>(() =>
  selectedTabIndex.value === 0 ? "topUp" : "subscription",
);

// Active data based on current tab
const transactions = ref<TopUpTransactionWithUser[]>([]);
const subscriptions = ref<SubscriptionWithUser[]>([]);
const meta = ref({ total: 0, page: 1, limit: 20, totalPages: 1 });

// ── Fetch params ────────────────────────────────────────────────
const fetchParams = computed(() => {
  const base = {
    page: currentPage.value,
    limit: 20,
    search: search.value || undefined,
    orderBy: orderBy.value,
    order: "desc",
    type: selectedTab.value,
  };

  if (selectedTab.value === "topUp") {
    return {
      ...base,
      status: filterStatus.value !== "all" ? filterStatus.value : undefined,
      gateway: filterGateway.value !== "all" ? filterGateway.value : undefined,
    };
  }

  return {
    ...base,
    plan: filterPlan.value !== "all" ? filterPlan.value : undefined,
    isActive:
      filterActive.value !== "all"
        ? filterActive.value === "active"
        : undefined,
  };
});

// ── useFetch ──────────────────────────────────────────────────
const {
  data,
  pending: isLoading,
  status,
  error,
  refresh,
} = useFetch("/api/transactions", {
  query: fetchParams,
  watch: [fetchParams],
  server: false,
  immediate: false,
  async transform(response: any) {
    if (!response?.success) return;

    meta.value = response.meta ?? {
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    };

    if (response.data?.type === "topUp") {
      transactions.value = response.data?.transactions ?? [];
      subscriptions.value = [];
    } else {
      subscriptions.value = response.data?.subscriptions ?? [];
      transactions.value = [];
    }
  },
});

// Active data
const activeData = computed(() =>
  selectedTab.value === "topUp"
    ? (transactions.value as TopUpTransactionWithUser[])
    : (subscriptions.value as SubscriptionWithUser[]),
);

// ── Fetch on mount & param changes ────────────────────────────
watch(
  selectedTabIndex,
  () => {
    refresh();
  },
  { immediate: true },
);

watch(
  data,
  (newData) => {
    isLoading.value = false;
  },
  { immediate: false },
);

// ── Filter change ──────────────────────────────────────────────
const debouncedFetch = useDebounceFn(() => {
  currentPage.value = 1;
  refresh();
}, 400);

function onFilterChange() {
  currentPage.value = 1;
  refresh();
}

function onPageChange(page: number) {
  currentPage.value = page;
  refresh();
}

// ── Delete ────────────────────────────────────────────────────
async function executeDelete() {
  const id =
    selectedTab.value === "topUp"
      ? dataTopUpDelete.value?.id
      : dataSubscriptionDelete.value?.id;

  if (!id) return;

  try {
    isLoading.value = true;
    await $fetch(`/api/transactions/${id}`, {
      method: "DELETE",
      query: { type: selectedTab.value },
    });
    toast.add({
      title: "Deleted successfully",
      color: "success",
      icon: "i-heroicons-check",
    });
    showDeleteModal.value = false;
    dataTopUpDelete.value = null;
    dataSubscriptionDelete.value = null;
    await refresh();
  } catch (err) {
    toast.add({
      title: "Failed to delete",
      description: err instanceof Error ? err.message : "Try again",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    isLoading.value = false;
  }
}

async function executeBulkDelete() {
  if (dataIdsDelete.value.length === 0) return;

  try {
    isLoading.value = true;
    await $fetch("/api/transactions/bulk-delete", {
      method: "POST",
      body: {
        ids: dataIdsDelete.value,
        type: selectedTab.value,
      },
    });
    toast.add({
      title: "Deleted successfully",
      description: `${dataIdsDelete.value.length} items deleted`,
      color: "success",
      icon: "i-heroicons-check",
    });
    showBulkDeleteModal.value = false;
    dataIdsDelete.value = [];
    await refresh();
  } catch (err) {
    toast.add({
      title: "Failed to delete",
      description: err instanceof Error ? err.message : "Try again",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    isLoading.value = false;
  }
}

// ── Init ────────────────────────────────────────────────────────
onMounted(() => {
  refresh();
});

const statusOptions = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Failed", value: "failed" },
  { label: "Refunded", value: "refunded" },
  { label: "Expired", value: "expired" },
];
const gatewayOptions = [
  { label: "All", value: "all" },
  { label: "PayPal", value: "paypal" },
  { label: "Midtrans", value: "midtrans" },
  { label: "Xendit", value: "xendit" },
];
const planOptions = [
  { label: "All", value: "all" },
  { label: "Free", value: "free" },
  { label: "Starter", value: "starter" },
  { label: "Pro", value: "pro" },
  { label: "Enterprise", value: "enterprise" },
];
</script>

<template>
  <AppDashboardLayout id="transactions" title="Transactions">
    <template #content>
      <div class="min-h-screen p-6">
        <div class="mx-auto max-w-7xl space-y-6">
          <!-- Tabs -->
          <UTabs
            v-model="selectedTabIndex"
            :items="items"
            variant="pill"
            :ui="{
              trigger:
                'group relative inline-flex items-center min-w-0 data-[state=inactive]:text-muted data-[state=active]:not-disabled:text-white hover:data-[state=inactive]:not-disabled:text-default font-medium rounded-md disabled:cursor-not-allowed disabled:opacity-75 cursor-pointer',
            }"
            class="gap-4 w-full text-neutral-800 dark:text-white"
          >
            <template #topUp="{ item }">
              <div class="flex items-center justify-between">
                <div>
                  <h1 class="text-2xl font-bold tracking-tight">
                    {{ item.label }}
                  </h1>
                  <p class="text-sm text-muted mt-0.5">
                    {{ item.description }}
                  </p>
                </div>
              </div>
            </template>
            <template #subscription="{ item }">
              <div class="flex items-center justify-between">
                <div>
                  <h1 class="text-2xl font-bold tracking-tight">
                    {{ item.label }}
                  </h1>
                  <p class="text-sm text-muted mt-0.5">
                    {{ item.description }}
                  </p>
                </div>
              </div>
            </template>
          </UTabs>

          <!-- Filters (per tab) -->
          <div class="bg-muted border border-muted rounded-xl p-5 space-y-4">
            <UInput
              v-model="search"
              icon="i-heroicons-magnifying-glass"
              placeholder="Search..."
              class="flex-1"
              @input="debouncedFetch"
            />

            <!-- TopUp filters -->
            <div v-if="selectedTab === 'topUp'" class="flex flex-wrap gap-3">
              <USelect
                v-model="filterStatus"
                :items="statusOptions"
                placeholder="All Status"
                class="w-full sm:w-40"
                @change="onFilterChange"
              />
              <USelect
                v-model="filterGateway"
                :items="gatewayOptions"
                placeholder="All Gateway"
                class="w-full sm:w-40"
                @change="onFilterChange"
              />
            </div>

            <!-- Subscription filters -->
            <div v-else class="flex flex-wrap gap-3">
              <USelect
                v-model="filterPlan"
                :items="planOptions"
                placeholder="All Plan"
                class="w-full sm:w-40"
                @change="onFilterChange"
              />
              <USelect
                v-model="filterActive"
                :items="[
                  { label: 'All Status', value: 'all' },
                  { label: 'Active', value: 'active' },
                  { label: 'Inactive', value: 'inactive' },
                ]"
                placeholder="All Status"
                class="w-full sm:w-40"
                @change="onFilterChange"
              />
            </div>
          </div>

          <!-- Table / Data display here -->
          <!-- Placeholder: add your table component -->
          <div class="bg-muted border border-muted rounded-xl p-5">
            <div v-if="isLoading" class="flex justify-center py-10">
              <UIcon
                name="i-heroicons-arrow-path"
                class="w-8 h-8 animate-spin"
              />
            </div>
            <div v-else-if="activeData.length === 0" class="text-center py-10">
              <UIcon
                name="i-heroicons-inbox"
                class="w-12 h-12 mx-auto text-muted"
              />
              <p class="text-muted mt-2">No data found</p>
            </div>
            <div v-else>
              <!-- Table placeholder - add your table here -->
              <p class="text-sm text-muted">{{ activeData.length }} records</p>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="meta.totalPages > 1" class="flex justify-center">
            <UPagination
              :page="currentPage"
              :total="meta.total"
              :items-per-page="meta.limit"
              @update:page="onPageChange"
            />
          </div>

          <!-- Delete modal -->
          <UModal v-model:open="showDeleteModal">
            <template #content>
              <div class="p-6 space-y-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center"
                  >
                    <UIcon
                      name="i-heroicons-trash"
                      class="w-5 h-5 text-error"
                    />
                  </div>
                  <div>
                    <h3 class="font-semibold">
                      Delete
                      {{ selectedTab === "topUp" ? "Top Up" : "Subscription" }}?
                    </h3>
                    <p class="text-sm text-muted">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div class="flex gap-2 justify-end">
                  <UButton
                    variant="ghost"
                    size="md"
                    @click="showDeleteModal = false"
                  >
                    Cancel
                  </UButton>
                  <UButton
                    color="error"
                    size="md"
                    class="text-white"
                    :loading="isLoading"
                    @click="executeDelete"
                  >
                    Delete
                  </UButton>
                </div>
              </div>
            </template>
          </UModal>

          <!-- Bulk delete dialog -->
          <AlertDialog
            :open="showBulkDeleteModal"
            type="warning"
            :title="`Delete ${dataIdsDelete.length} items?`"
            message="This action cannot be undone. All selected items will be deleted permanently."
            is-action
            label-action="Delete"
            label-close="Cancel"
            @onaction="executeBulkDelete"
            @onclose="showBulkDeleteModal = false"
          />
        </div>
      </div>
    </template>
  </AppDashboardLayout>
</template>

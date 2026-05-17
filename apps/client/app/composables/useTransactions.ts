import type { TopUpTransaction, Subscription, User, TransactionStatus } from "@forge-exchange/db";

interface TopUpTransactionWithUser extends TopUpTransaction {
  user: User
}
interface SubscriptionWithUser extends Subscription {
  user: User
}

export type TransactionTab = "topup" | "subscription";

interface FetchParams {
  page?: number;
  limit?: number;
  status?: TransactionStatus;
  search?: string;
  orderBy?: string;
  order?: string;
  type?: TransactionTab;
  gateway?: "midtrans" | "xendit" | "paypal"
  plan?: "free" | "starter" | "pro" | "enterprise"
  isActive?: boolean;
}

export const useTransactions = () => {
  const transactions = ref<TopUpTransactionWithUser[]>([]);
  const subscriptions = ref<SubscriptionWithUser[]>([]);
  const isLoading = ref(false);
  const meta = ref({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const error = ref<string | null>(null);
  const currentParams = ref<FetchParams>({ type: "topup" });
  const selectedTab = ref<TransactionTab>("topup");
  const toast = useToast();

  async function fetchTransactions(params?: FetchParams) {
    isLoading.value = true;
    error.value = null;

    // Merge: keep type from currentParams if not overridden
    const mergedParams = {
      ...currentParams.value,
      ...params,
      type: params?.type ?? currentParams.value.type ?? "topup",
    };
    currentParams.value = mergedParams;

    try {
      const res = await $fetch<ApiResponse<{
        type: TransactionTab;
        transactions: TopUpTransactionWithUser[];
        subscriptions: SubscriptionWithUser[];
      }>>("/api/transactions", { query: mergedParams });

      if (!res.success) {
        transactions.value = [];
        subscriptions.value = [];
        meta.value = { total: 0, page: 1, limit: 20, totalPages: 1 };
        return;
      }

      if (res.data?.type === 'topup') {
        transactions.value = res.data?.transactions || [];
        subscriptions.value = [];
      } else {
        subscriptions.value = res.data?.subscriptions || [];
        transactions.value = [];
      }

      meta.value = res.meta as unknown as ApiMeta;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Fail to fetch transactions";
    } finally {
      isLoading.value = false;
    }
  }

  async function bulkDelete(ids: string[], type: TransactionTab) {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetch<ApiResponse>("/api/transactions/bulk-delete", {
        method: "POST",
        body: { ids, type },
      });

      if (!res.success) {
        throw new Error(res.message ?? "Fail to delete transactions");
      }

      toast.add({
        title: "Deleted successfully",
        description: `${ids.length} items deleted`,
        color: "success",
        icon: "material-symbols:check-circle-outline",
      });

      // Re-fetch with current params (keeps same tab, page, filters)
      await fetchTransactions(currentParams.value);

      return true
    } catch (err) {
      toast.add({
        title: "Failed to delete",
        description: err instanceof Error ? err.message : "Try again",
        color: "error",
        icon: "material-symbols:x-circle-outline",
      });
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteTransaction(id: string, type: TransactionTab) {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetch<ApiResponse>(`/api/transactions/${id}`, {
        method: "DELETE",
        query: { type },
      });

      if (!res.success) {
        throw new Error(res?.message ?? "Fail to delete transaction");
      }

      toast.add({
        title: "Deleted successfully",
        description: "Transaction deleted",
        color: "success",
        icon: "material-symbols:check-circle-outline",
      });

      // Re-fetch with current params
      await fetchTransactions(currentParams.value);
      return true;
    } catch (err) {
      toast.add({
        title: "Failed to delete",
        description: err instanceof Error ? err.message : "Try again",
        color: "error",
        icon: "material-symbols:x-circle-outline",
      });
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  function setTab(tab: TransactionTab) {
    selectedTab.value = tab;
    fetchTransactions({ ...currentParams.value, type: tab, page: 1 });
  }

  return {
    transactions,
    subscriptions,
    isLoading,
    meta,
    error,
    selectedTab,
    currentParams,
    fetchTransactions,
    bulkDelete,
    deleteTransaction,
    setTab,
  }
}

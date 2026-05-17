import type { TopUpTransaction, Subscription, User, TransactionStatus } from "@forge-exchange/db";

interface TopUpTransactionWithUser extends TopUpTransaction {
  user: User
}
interface SubscriptionWithUser extends Subscription {
  user: User
}

export const useTransactions = () => {
  const transactions = ref<TopUpTransactionWithUser[]>([]);
  const subscriptions = ref<SubscriptionWithUser[]>([]);
  const isLoading = ref(false);
  const meta = ref({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const error = ref<string | null>(null);
  const toast = useToast();

  async function fetchTransactions(params?: {
    page?: number;
    limit?: number;
    status?: TransactionStatus;
    search?: string;
    orderBy?: string;
    order?: string;
    type?: "topUp" | "subscription";
    gateway?: "midtrans" | "xendit" | "paypal"
    plan?: "free" | "starter" | "pro" | "enterprise"
  }) {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetch<ApiResponse<{
        type: "topUp" | "subscription";
        transactions: TopUpTransactionWithUser[];
        subscriptions: SubscriptionWithUser[];
      }>>("/api/transactions", { query: params });
      if (!res.success) {
        transactions.value = [];
        subscriptions.value = [];
        meta.value = { total: 0, page: 1, limit: 20, totalPages: 1 };
        return;
      }
      if (res.data?.type === 'topUp') {
        transactions.value = res.data?.transactions || [];
      } else {
        subscriptions.value = res.data?.subscriptions || [];
      }

      meta.value = res.meta as unknown as ApiMeta;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Fail to fetch users";
    } finally {
      isLoading.value = false;
    }
  }

  async function bulkDelete(body: { ids: string[], type: "topUp" | "subscription" }) {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetch("/api/transactions/bulk-delete", { method: "POST", body });
      if (!res.success) {
        throw new Error(res.message ?? "Fail to delete transactions");
      }
      toast.add({
        title: "Transactions deleted successfully",
        description: res.message ?? "Transactions deleted successfully",
        color: "success",
        icon: "material-symbols:check-circle-outline",
      });
      fetchTransactions();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Fail to delete transactions";
      toast.add({
        title: "Failed to bulk delete transactions",
        description: err instanceof Error ? err.message : "Try again",
        color: "error",
        icon: "material-symbols:x-circle-outline",
      });
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteTransaction(id: string, type: "topUp" | "subscription") {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetch<ApiResponse>(`/api/transactions/${id}?type=${type}`, {
        method: "DELETE",
      });
      if (!res.success) {
        throw new Error(res?.message ?? "Fail to delete transaction");
      }
      toast.add({
        title: "Transaction deleted successfully",
        description: res.message ?? "Transaction deleted successfully",
        color: "success",
        icon: "material-symbols:check-circle-outline",
      });

      return true;
    } catch (err) {
      toast.add({
        title: "Failed to delete transaction",
        description: err instanceof Error ? err.message : "Try again",
        color: "error",
        icon: "material-symbols:x-circle-outline",
      });
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    transactions,
    subscriptions,
    isLoading,
    meta,
    error,
    fetchTransactions,
    bulkDelete,
    deleteTransaction,
  }
}

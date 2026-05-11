export function useBilling() {
  const subscription = ref<BillingSubscription | null>(null)
  const packages = ref<CreditPackage[]>([])
  const plans = ref<SubscriptionPlan[]>([])
  const creditLogs = ref<CreditLogItem[]>([])
  const transactions = ref<TopUpTransaction[]>([])
  const logMeta = ref({ total: 0, page: 1, limit: 20, totalPages: 1 })
  const txMeta = ref({ total: 0, page: 1, limit: 10, totalPages: 1 })
  const isLoading = ref(false)
  const isTopingUp = ref(false)

  const toast = useToast()

  // ── Fetch subscription ────────────────────────────────────
  async function fetchSubscription() {
    isLoading.value = true
    try {
      const res = await $fetch('/api/billing/subscription')
      if (!res.success || !res.data) {
        throw new Error('Failed to fetch subscription')
      }
      subscription.value = res.data.subscription
      packages.value = res.data.packages
      plans.value = res.data.plans
    } catch (err: any) {
      toast.add({
        title: 'Failed to fetch subscription',
        description: err instanceof Error ? err.message : 'Try Again',
        color: 'error',
      })
    } finally {
      isLoading.value = false
    }
  }

  // ── Fetch credit logs ─────────────────────────────────────
  async function fetchCreditLogs(params?: { page?: number; type?: string }) {
    try {
      const res = await $fetch('/api/billing/history', { query: params })
      creditLogs.value = res.data.logs
      logMeta.value = res.meta
    } catch { /* silent */ }
  }

  // ── Fetch transactions ────────────────────────────────────
  async function fetchTransactions(params?: { page?: number }) {
    try {
      const res = await $fetch('/api/billing/transactions', { query: params })
      transactions.value = res.data.transactions
      txMeta.value = res.meta
    } catch { /* silent */ }
  }

  // ── Create topup ──────────────────────────────────────────
  async function createTopUp(amountIdr: number, gateway: 'midtrans' | 'xendit'): Promise<string | null> {
    isTopingUp.value = true
    try {
      const res = await $fetch('/api/billing/topup', {
        method: 'POST',
        body: { amount: amountIdr, gateway },
      })
      toast.add({
        title: 'Topup created!',
        description: 'You will be redirected to the payment page.',
        color: 'success',
        icon: 'i-heroicons-credit-card',
      })
      return res.data.paymentUrl
    } catch (err) {
      toast.add({
        title: 'Topup failed',
        description: err instanceof Error ? err.message : 'Try Again',
        color: 'error',
      })
      return null
    } finally {
      isTopingUp.value = false
    }
  }

  // ── Credit balance percentage ─────────────────────────────
  const balancePct = computed(() => {
    if (!subscription.value) return 0
    const { creditBalance, creditLimit } = subscription.value
    if (!creditLimit) return 100
    return Math.min(100, Math.round((creditBalance / creditLimit) * 100))
  })

  return {
    subscription, packages, plans,
    creditLogs, logMeta,
    transactions, txMeta,
    isLoading, isTopingUp,
    balancePct,
    fetchSubscription,
    fetchCreditLogs,
    fetchTransactions,
    createTopUp,
  }
}

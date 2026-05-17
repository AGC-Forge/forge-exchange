import type { ProxyPool } from "@forge-exchange/db"

export function useProxies() {
  const proxies = ref<ProxyItem[]>([])
  const meta = ref<ApiMeta>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
    offset: 1,
    has_more: false,
  })
  const stats = ref<ProxyStats>({ active: 0, total: 0 })
  const isLoading = ref(false)
  const isActing = ref<Record<string, boolean>>({})
  const error = ref<string | null>(null)

  const toast = useToast()

  // ── Fetch list ──────────────────────────────────────────────
  async function fetchProxies(params?: {
    page?: number
    limit?: number
    status?: string
    type?: string
    country?: string
    search?: string
  }) {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<ApiResponse<{ proxies: ProxyItem[], stats: ProxyStats }>>('/api/proxies', { query: params })

      if (!res.success) throw new Error(res.message || 'Unknown error')
      proxies.value = res.data?.proxies ?? []
      meta.value = res.meta as ApiMeta
      stats.value = res.data?.stats ?? { active: 0, total: 0 }
    } catch (err: any) {
      error.value = err instanceof Error ? err.message : 'Gagal memuat proxies'
    } finally {
      isLoading.value = false
    }
  }

  // ── Add single proxy ────────────────────────────────────────
  async function addProxy(data: Record<string, any>): Promise<boolean> {
    try {
      const res = await $fetch<ApiResponse<{ proxy: ProxyPool, testResult: ProxyTestResult }>>('/api/proxies', { method: 'POST', body: data })

      if (!res.success) throw new Error(res.message || 'Unknown error')

      toast.add({
        title: res.message,
        color: res.data?.testResult?.success ? 'success' : 'warning',
        icon: res.data?.testResult?.success
          ? 'i-heroicons-check-circle'
          : 'i-heroicons-exclamation-triangle',
      })
      await fetchProxies()
      return true
    } catch (err: any) {
      toast.add({
        title: err.message || 'Failed to add proxy',
        description: err?.data?.error?.message ?? 'Try again',
        color: 'error',
      })
      return false
    }
  }

  // ── Delete proxy ────────────────────────────────────────────
  async function deleteProxy(id: string): Promise<boolean> {
    isActing.value[id] = true
    try {
      const res = await $fetch<ApiResponse>(`/api/proxies/${id}`, { method: 'DELETE' })
      if (!res.success) throw new Error(res.message || 'Unknown error')

      toast.add({ title: 'Proxy deleted', color: 'success', icon: 'i-heroicons-trash' })
      proxies.value = proxies.value.filter(p => p.id !== id)
      stats.value.total = Math.max(0, stats.value.total - 1)
      return true
    } catch (err) {
      toast.add({
        title: err instanceof Error ? err.message : 'Failed to delete proxy',
        description: err instanceof Error ? err.message : 'Try again',
        color: 'error',
      })
      return false
    } finally {
      isActing.value[id] = false
    }
  }

  // ── Test single proxy ────────────────────────────────────────
  async function testProxy(id: string): Promise<boolean> {
    isActing.value[id] = true

    // Optimistic: set to testing
    const idx = proxies.value.findIndex(p => p.id === id)
    if (idx !== -1)
      if (proxies.value[idx]) proxies.value[idx].status = 'testing'

    try {
      const res = await $fetch<ApiResponse<ProxyTestResult>>('/api/proxies/test', { method: 'POST', body: { id } })
      if (!res.success) throw new Error(res.message || 'Unknown error')
      toast.add({
        title: res.message,
        color: res.data?.success ? 'success' : 'warning',
        icon: res.data?.success ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle',
      })
      // Update proxy status locally
      if (idx !== -1 && proxies.value[idx]) {
        proxies.value[idx].status = res.data?.success ? 'active' : 'error'
        proxies.value[idx].responseTimeMs = res.data?.responseTime ?? null
        proxies.value[idx].lastTestedAt = new Date().toISOString()
      }
      return res.data?.success ?? false
    } catch (err) {
      toast.add({
        title: err instanceof Error ? err.message : 'Failed to test proxy',
        description: err instanceof Error ? err.message : 'Try again',
        color: 'error',
      })
      if (idx !== -1 && proxies.value[idx]) proxies.value[idx].status = 'error'
      return false
    } finally {
      isActing.value[id] = false
    }
  }

  // ── Bulk import ─────────────────────────────────────────────
  async function bulkImport(raw: string, type: string): Promise<any> {
    try {
      const res = await $fetch<ApiResponse<
        {
          total: number;
          imported: number;
          skipped: number;
          invalid: number;
          duplicates: number;
          errors: string[];
        }>>('/api/proxies/bulk-import', {
          method: 'POST',
          body: { raw, type },
        })
      if (!res.success) throw new Error(res.message || 'Unknown error')
      toast.add({
        title: res.message,
        color: 'success',
        icon: 'i-heroicons-arrow-up-tray',
      })
      await fetchProxies()
      return res.data
    } catch (err) {
      toast.add({
        title: err instanceof Error ? err.message : 'Import failed',
        description: err instanceof Error ? err.message : 'Try again',
        color: 'error',
      })
      return null
    }
  }

  // ── Health check all ────────────────────────────────────────
  const isHealthChecking = ref(false)

  async function runHealthCheck(): Promise<void> {
    isHealthChecking.value = true
    try {
      const res = await $fetch<ApiResponse<{
        total: number;
        passed: number;
        failed: number;
      }>>('/api/proxies/health-check', { method: 'POST' })
      if (!res.success) throw new Error(res.message || 'Unknown error')
      toast.add({
        title: 'Health check selesai',
        description: res.message,
        color: 'success',
        icon: 'i-heroicons-heart',
      })
      await fetchProxies()
    } catch (err) {
      toast.add({
        title: err instanceof Error ? err.message : 'Health check failed',
        description: err instanceof Error ? err.message : 'Try again',
        color: 'error',
      })
    } finally {
      isHealthChecking.value = false
    }
  }

  async function bulkDeleteProxy(ids: string[]): Promise<boolean> {
    try {
      const res = await $fetch<ApiResponse<{
        success: boolean;
        message: string;
        data: null;
      }>>('/api/proxies/bulk-delete', {
        method: 'POST',
        body: { ids },
      })
      if (!res.success) throw new Error(res.message || 'Unknown error')
      toast.add({
        title: res.message,
        color: 'success',
        icon: 'i-heroicons-trash',
      })
      await fetchProxies()
      return true
    } catch (err) {
      toast.add({
        title: err instanceof Error ? err.message : 'Failed to delete proxies',
        description: err instanceof Error ? err.message : 'Try again',
        color: 'error',
      })
      return false
    }
  }

  return {
    proxies,
    meta,
    stats,
    isLoading,
    isActing,
    isHealthChecking,
    error,
    fetchProxies,
    addProxy,
    deleteProxy,
    testProxy,
    bulkImport,
    runHealthCheck,
    bulkDeleteProxy,
  }
}

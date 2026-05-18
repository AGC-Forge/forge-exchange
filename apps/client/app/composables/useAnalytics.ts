export function useAnalytics() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const globalData = ref<GlobalAnalytics | null>(null)

  async function fetchOverview(
    period = '7d',
    executionSource?: 'none' | 'pool' | 'integration' | '',
  ) {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch('/api/analytics/overview', {
        query: {
          period,
          ...(executionSource ? { executionSource } : {}),
        },
      })
      if (!res.success) {
        throw new Error(res.message ?? 'Failed to fetch analytics')
      }
      globalData.value = res.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch analytics'
    } finally {
      isLoading.value = false
    }
  }

  // ── Campaign analytics ───────────────────────────────────────
  const campaignData = ref<CampaignAnalytics | null>(null)
  async function fetchCampaignAnalytics(
    campaignId: string,
    period = '7d',
    executionSource?: 'none' | 'pool' | 'integration' | '',
  ) {
    isLoading.value = true
    error.value = null
    campaignData.value = null
    try {
      const res = await $fetch(`/api/analytics/campaign/${campaignId}`, {
        query: {
          period,
          ...(executionSource ? { executionSource } : {}),
        },
      })
      if (!res.success) {
        throw new Error(res.message ?? 'Failed to fetch analytics campaign')
      }
      campaignData.value = res.data as any
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch analytics campaign'
    } finally {
      isLoading.value = false
    }
  }

  // ── GEO analytics ────────────────────────────────────────────
  const geoData = ref<GeoResult | null>(null)
  async function fetchGeoAnalytics(period = '7d') {
    isLoading.value = true
    try {
      const res = await $fetch('/api/analytics/geo', { query: { period } })
      if (!res.success) {
        throw new Error(res.message ?? 'Failed to fetch analytics geo')
      }
      geoData.value = res.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch analytics geo'
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading, error,
    globalData, fetchOverview,
    campaignData, fetchCampaignAnalytics,
    geoData, fetchGeoAnalytics,
  }
}

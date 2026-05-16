export function useCampaigns() {
  const campaigns = ref<CampaignModel[]>([]);
  const isLoading = ref(false);
  const isActing = ref<Record<string, boolean>>({});
  const meta = ref({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const error = ref<string | null>(null);

  const toast = useToast();

  // ── Fetch list ──────────────────────────────────────────────
  async function fetchCampaigns(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    orderBy?: string;
    order?: string;
  }) {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetch("/api/campaigns", { query: params });
      if (!res.success) {
        campaigns.value = [];
        meta.value = { total: 0, page: 1, limit: 20, totalPages: 1 };
        return;
      }

      campaigns.value = res.data.campaigns as unknown as CampaignModel[];
      meta.value = res.meta;
    } catch (err: any) {
      error.value = err?.data?.error?.message ?? "Gagal memuat campaigns";
    } finally {
      isLoading.value = false;
    }
  }

  // ── Fetch single ────────────────────────────────────────────
  async function fetchCampaign(id: string): Promise<CampaignModel | null> {
    try {
      const res = await $fetch(`/api/campaigns/${id}`);
      if (!res.success) {
        return null;
      }
      return res.data as unknown as CampaignModel;
    } catch {
      return null;
    }
  }

  // ── Create ──────────────────────────────────────────────────
  async function createCampaign(
    data: Record<string, any>,
  ): Promise<CampaignModel | null> {
    try {
      const res = await $fetch("/api/campaigns", {
        method: "POST",
        body: data,
      });
      if (!res.success) {
        return null;
      }
      toast.add({
        title: "Campaign dibuat!",
        color: "success",
        icon: "i-heroicons-check-circle",
      });
      await fetchCampaigns();
      return res.data.campaign as unknown as CampaignModel;
    } catch (err: any) {
      toast.add({
        title: "Gagal membuat campaign",
        description: err?.data?.error?.message ?? "Coba lagi",
        color: "error",
        icon: "i-heroicons-x-circle",
      });
      return null;
    }
  }

  // ── Update ──────────────────────────────────────────────────
  async function updateCampaign(
    id: string,
    data: Record<string, any>,
  ): Promise<boolean> {
    try {
      const res = await $fetch(`/api/campaigns/${id}`, {
        method: "PUT",
        body: data,
      });
      if (!res.success) {
        toast.add({
          title: "Gagal update campaign",
          description: res?.message ?? "Try again",
          color: "error",
        });
        return false;
      }
      toast.add({
        title: "Campaign updated successfully!",
        color: "success",
        icon: "i-heroicons-check-circle",
      });
      await fetchCampaigns();
      return true;
    } catch (err) {
      toast.add({
        title: "Failed to update campaign",
        description: err instanceof Error ? err.message : "Try again",
        color: "error",
      });
      return false;
    }
  }

  // ── Delete ──────────────────────────────────────────────────
  async function deleteCampaign(id: string): Promise<boolean> {
    isActing.value[id] = true;
    try {
      const res = await $fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (!res.success) {
        toast.add({
          title: "Failed to delete campaign",
          description: res?.message ?? "Try again",
          color: "error",
        });
        return false;
      }
      toast.add({
        title: "Campaign deleted successfully!",
        color: "success",
        icon: "i-heroicons-trash",
      });
      campaigns.value = campaigns.value.filter((c) => c.id !== id);
      return true;
    } catch (err) {
      toast.add({
        title: "Failed to delete campaign",
        description: err instanceof Error ? err.message : "Try again",
        color: "error",
      });
      return false;
    } finally {
      isActing.value[id] = false;
    }
  }

  // ── Action helpers ──────────────────────────────────────────
  async function doAction(
    id: string,
    action: "start" | "stop" | "pause",
  ): Promise<boolean> {
    isActing.value[id] = true;
    const labels = { start: "dimulai", stop: "dihentikan", pause: "dijeda" };
    try {
      const res = await $fetch(`/api/campaigns/${id}/${action}`, {
        method: "POST",
      });
      if (!res.success) {
        toast.add({
          title: `Failed to ${action} campaign`,
          description: res?.message ?? "Try again",
          color: "error",
        });
        return false;
      }
      toast.add({
        title: `Campaign ${labels[action]}`,
        color: action === "stop" ? "warning" : "success",
        icon: "i-heroicons-check-circle",
      });
      // Optimistic update status
      const idx = campaigns.value.findIndex((c) => c.id === id);
      if (idx !== -1) {
        const statusMap = {
          start: "queued",
          stop: "cancelled",
          pause: "paused",
        };
        if (campaigns.value[idx]) {
          campaigns.value[idx].status = statusMap[action] as CampaignStatus;
        }
      }
      return true;
    } catch (err) {
      toast.add({
        title: `Failed to ${action} campaign`,
        description: err instanceof Error ? err.message : "Try again",
        color: "error",
      });
      return false;
    } finally {
      isActing.value[id] = false;
    }
  }

  const startCampaign = (id: string) => doAction(id, "start");
  const stopCampaign = (id: string) => doAction(id, "stop");
  const pauseCampaign = (id: string) => doAction(id, "pause");

  return {
    campaigns,
    meta,
    isLoading,
    isActing,
    error,
    fetchCampaigns,
    fetchCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    startCampaign,
    stopCampaign,
    pauseCampaign,
  };
}

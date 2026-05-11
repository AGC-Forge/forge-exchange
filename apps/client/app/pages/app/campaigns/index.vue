<script setup lang="ts">
import type { SelectItem } from "@nuxt/ui";

type ColorVariant =
  | "indigo"
  | "emerald"
  | "amber"
  | "red"
  | "blue"
  | "purple"
  | "slate";

definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Campaigns",
  description:
    "Welcome to your campaigns page. Here you can manage your campaigns.",
  robots: "noindex, nofollow",
});

const {
  campaigns,
  meta,
  isLoading,
  isActing,
  fetchCampaigns,
  startCampaign,
  stopCampaign,
  pauseCampaign,
  deleteCampaign,
} = useCampaigns();

const search = ref("");
const filterStatus = ref("all");
const orderBy = ref("createdAt");
const currentPage = ref(1);
const showDeleteModal = ref(false);
const deletingCampaign = ref<CampaignModel | null>(null);

const statusOptions: SelectItem[] = [
  { label: "All Status", value: "all" },
  ...Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
    label: cfg.label,
    value,
  })),
];

const orderOptions: SelectItem[] = [
  { label: "Latest", value: "createdAt" },
  { label: "Name", value: "name" },
  { label: "Status", value: "status" },
  { label: "Total Sessions", value: "totalSessions" },
];

const hasActiveFilters = computed(() => {
  return (
    search.value !== "" ||
    filterStatus.value !== "all" ||
    orderBy.value !== "createdAt"
  );
});

const stats = computed(() => {
  const all = campaigns.value;
  const running = all.filter((c) => c.status === "running").length;
  const paused = all.filter((c) => c.status === "paused").length;
  const totalSess = all.reduce((s, c) => s + (c.totalSessions ?? 0), 0);
  const todaySess = all.reduce((s, c) => s + (c.todayCount ?? 0), 0);
  return [
    {
      label: "Total Campaign",
      value: meta.value.total,
      color: "indigo",
      icon: "ic:sharp-campaign",
    },
    {
      label: "Running",
      value: running,
      color: "emerald",
      icon: "material-symbols:play-circle-outline",
    },
    {
      label: "Paused",
      value: paused,
      color: "amber",
      icon: "material-symbols:pause-circle-outline-rounded",
    },
    {
      label: "Total Sessions",
      value: totalSess.toLocaleString(),
      color: "blue",
      icon: "streamline-ultimate:graph-stats-circle",
    },
    {
      label: "Session Today",
      value: todaySess.toLocaleString(),
      color: "purple",
      icon: "streamline-ultimate:graph-stats-circle",
    },
  ];
});

function buildParams() {
  return {
    page: currentPage.value,
    limit: 20,
    search: search.value || undefined,
    status: filterStatus.value !== "all" ? filterStatus.value : undefined,
    orderBy: orderBy.value,
    order: "desc",
  };
}

const debouncedFetch = useDebounceFn(() => {
  currentPage.value = 1;
  fetchCampaigns(buildParams());
}, 400);

function onFilterChange() {
  currentPage.value = 1;
  fetchCampaigns(buildParams());
}

function onPageChange(page: number) {
  currentPage.value = page;
  fetchCampaigns(buildParams());
}

// ── Delete ────────────────────────────────────────────────────
function confirmDelete(campaign: CampaignModel) {
  deletingCampaign.value = campaign;
  showDeleteModal.value = true;
}

async function executeDelete() {
  if (!deletingCampaign.value) return;
  const ok = await deleteCampaign(deletingCampaign.value.id);
  if (ok) showDeleteModal.value = false;
}

// ── Init ─────────────────────────────────────────────────────
onMounted(() => fetchCampaigns(buildParams()));

const clearFilters = async () => {
  search.value = "";
  filterStatus.value = "all";
  orderBy.value = "createdAt";
  currentPage.value = 1;
  await fetchCampaigns(buildParams());
};
</script>

<template>
  <AppDashboardLayout id="campaigns" title="Campaigns">
    <template #content>
      <div class="min-h-screen p-6">
        <div class="mx-auto max-w-7xl space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-neutral-100 tracking-tight">
                Campaigns
              </h1>
              <p class="text-sm text-neutral-500 mt-0.5">
                Manage all your traffic campaigns
              </p>
            </div>
            <UButton
              to="/app/campaigns/create"
              color="primary"
              icon="i-heroicons-plus"
              size="md"
              class="text-white"
            >
              Create Campaign
            </UButton>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <AppDashboardStatsCard
              v-for="stat in stats"
              :key="stat.label"
              :label="stat.label"
              :value="stat.value"
              :icon="stat.icon"
              :color="stat.color as ColorVariant"
              format="compact"
              :loading="isLoading"
            />
          </div>
          <UPageCard
            spotlight
            spotlight-color="info"
            title="Filter & Search"
            description="Filter campaign by status and type"
            :ui="{
              container:
                'shadow-md border border-info/20 dark:border-info/35 rounded-lg',
            }"
            class="mb-6 w-full shadow-sm"
          >
            <div class="flex flex-col sm:flex-row gap-3">
              <UInput
                v-model="search"
                icon="i-heroicons-magnifying-glass"
                placeholder="Search campaign..."
                class="flex-1"
                @input="debouncedFetch"
              />
              <USelect
                v-model="filterStatus"
                :items="statusOptions"
                placeholder="All status"
                class="w-full sm:w-48"
                @change="onFilterChange"
              />
              <USelect
                v-model="orderBy"
                :items="orderOptions"
                class="w-full sm:w-48"
                @change="onFilterChange"
              />
            </div>
            <div class="mt-4 flex items-center justify-between">
              <p class="text-muted text-sm">
                Showing {{ campaigns?.length }} of {{ meta.total }} campaigns
              </p>
              <UButton
                v-if="hasActiveFilters"
                variant="solid"
                color="error"
                size="sm"
                class="text-white"
                @click="clearFilters()"
              >
                Reset Filter
              </UButton>
            </div>
          </UPageCard>
          <!-- Loading -->
          <div v-if="isLoading" class="flex justify-center py-16">
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-8 h-8 text-indigo-400 animate-spin"
            />
          </div>

          <!-- Empty state -->
          <div v-else-if="campaigns.length === 0" class="text-center py-16">
            <UIcon
              name="i-heroicons-megaphone"
              class="w-12 h-12 text-neutral-600 mx-auto mb-4"
            />
            <h3 class="text-neutral-300 font-medium mb-1">
              No campaigns found
            </h3>
            <p class="text-neutral-500 text-sm mb-4">
              Create a campaign to boost traffic traffic
            </p>
            <UButton
              to="/app/campaigns/create"
              color="primary"
              size="md"
              icon="i-heroicons-plus"
              class="text-white"
            >
              Create Campaign
            </UButton>
          </div>

          <!-- Campaign cards -->
          <div v-else class="space-y-3">
            <AppCampaignCard
              v-for="campaign in campaigns"
              :key="campaign.id"
              :campaign="campaign"
              :is-acting="isActing[campaign.id]"
              @start="startCampaign(campaign.id)"
              @stop="stopCampaign(campaign.id)"
              @pause="pauseCampaign(campaign.id)"
              @delete="confirmDelete(campaign)"
            />
          </div>

          <!-- Pagination -->
          <div v-if="meta.totalPages > 1" class="flex justify-center">
            <UPagination
              v-model:page="currentPage"
              :total="meta.total"
              :items-per-page="meta.limit"
              @update:page="onPageChange"
            />
          </div>

          <!-- Delete confirm modal -->
          <UModal v-model:open="showDeleteModal">
            <template #content>
              <div class="p-6 space-y-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0"
                  >
                    <UIcon
                      name="i-heroicons-trash"
                      class="w-5 h-5 text-red-400"
                    />
                  </div>
                  <div>
                    <h3 class="font-semibold text-neutral-100">
                      Delete Campaign?
                    </h3>
                    <p class="text-sm text-neutral-500">
                      "{{ deletingCampaign?.name }}" will be deleted
                      permanently.
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
                    :loading="isActing[deletingCampaign?.id ?? '']"
                    @click="executeDelete"
                  >
                    Delete
                  </UButton>
                </div>
              </div>
            </template>
          </UModal>
        </div>
      </div>
    </template>
  </AppDashboardLayout>
</template>

<style scoped></style>

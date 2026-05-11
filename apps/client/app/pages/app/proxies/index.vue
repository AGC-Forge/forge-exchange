<script setup lang="ts">
import * as z from "zod";

definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Proxies",
  description: "Manage your proxies.",
  robots: "noindex, nofollow",
});

const {
  proxies,
  meta,
  stats,
  isLoading,
  isActing,
  isHealthChecking,
  fetchProxies,
  addProxy,
  deleteProxy,
  testProxy,
  runHealthCheck,
} = useProxies();

const search = ref("");
const filterStatus = ref("all");
const filterType = ref("all");
const filterCountry = ref("all");
const currentPage = ref(1);
const showAddModal = ref(false);
const showBulkModal = ref(false);
const showDeleteModal = ref(false);
const deletingProxy = ref<ProxyItem | null>(null);
const isSubmitting = ref(false);
const isTesting = ref(false);
const previewTest = ref<any>(null);
const hasActiveFilters = computed(() => {
  return (
    search.value !== "" ||
    filterStatus.value !== "all" ||
    filterType.value !== "all" ||
    filterCountry.value !== "all"
  );
});

const addForm = reactive({
  type: "http",
  host: "",
  port: 8080,
  username: "",
  password: "",
  country: "US",
  name: "",
});

const addSchema = z.object({
  type: z.string().min(1),
  host: z.string().min(1, "Host wajib diisi"),
  port: z.number().int().min(1).max(65535),
});

// ── Stats cards ───────────────────────────────────────────────
const statCards = computed(() => {
  const ps = proxies.value;
  const testing = ps.filter((p) => p.status === "testing").length;
  const banned = ps.filter(
    (p) => p.status === "banned" || p.isBlacklisted,
  ).length;
  const avgResp =
    ps
      .filter((p) => p.responseTimeMs)
      .reduce((s, p) => s + (p.responseTimeMs ?? 0), 0) /
    (ps.filter((p) => p.responseTimeMs).length || 1);

  return [
    {
      label: "Total Proxy",
      value: stats.value.total,
      color: "text-slate-200",
      border: "border-white/[0.08]",
    },
    {
      label: "Active",
      value: stats.value.active,
      color: "text-emerald-400",
      border: "border-emerald-500/15",
    },
    {
      label: "Testing",
      value: testing,
      color: "text-amber-400",
      border: "border-amber-500/15",
    },
    {
      label: "Avg Response",
      value: `${Math.round(avgResp)}ms`,
      color: "text-indigo-400",
      border: "border-indigo-500/15",
    },
  ];
});

// ── Select options ────────────────────────────────────────────
const statusOptions = [
  { label: "All Status", value: "all" },
  { label: "Active", value: "active" },
  { label: "Error", value: "error" },
  { label: "Testing", value: "testing" },
  { label: "Banned", value: "banned" },
  { label: "Inactive", value: "inactive" },
];

const typeOptions = [
  { label: "All Type", value: "all" },
  { label: "HTTP", value: "http" },
  { label: "HTTPS", value: "https" },
  { label: "SOCKS5", value: "socks5" },
  { label: "Residential", value: "residential" },
  { label: "Mobile", value: "mobile" },
  { label: "ISP", value: "isp" },
  { label: "Rotating", value: "rotating" },
];

const countryOptions = [
  { label: "All Country", value: "all" },
  ...COUNTRY_LIST.map((c) => ({
    label: `${c.code} — ${c.name}`,
    value: c.code,
  })),
];

const proxyTypeOptions = typeOptions.slice(1);

// ── Fetch helpers ─────────────────────────────────────────────
function buildParams() {
  return {
    page: currentPage.value,
    limit: 20,
    search: search.value || undefined,
    status: filterStatus.value !== "all" ? filterStatus.value : undefined,
    type: filterType.value !== "all" ? filterType.value : undefined,
    country: filterCountry.value !== "all" ? filterCountry.value : undefined,
  };
}

const debouncedFetch = useDebounceFn(() => {
  currentPage.value = 1;
  fetchProxies(buildParams());
}, 400);

function onFilterChange() {
  currentPage.value = 1;
  fetchProxies(buildParams());
}

function onPageChange(page: number) {
  currentPage.value = page;
  fetchProxies(buildParams());
}

// ── Add proxy ─────────────────────────────────────────────────
async function handlePreviewTest() {
  if (!addForm.host || !addForm.port) return;
  isTesting.value = true;
  previewTest.value = null;
  try {
    const res = await $fetch<ApiResponse<ProxyTestResult>>(
      "/api/proxies/test",
      {
        method: "POST",
        body: {
          type: addForm.type,
          host: addForm.host,
          port: addForm.port,
          username: addForm.username || undefined,
          password: addForm.password || undefined,
        },
      },
    );
    previewTest.value = res.data;
  } catch {
    previewTest.value = {
      success: false,
      error: "Test gagal",
      responseTime: 0,
    };
  } finally {
    isTesting.value = false;
  }
}

async function handleAddProxy() {
  isSubmitting.value = true;
  const ok = await addProxy({
    ...addForm,
    country: addForm.country.toUpperCase() || undefined,
    username: addForm.username || undefined,
    password: addForm.password || undefined,
    name: addForm.name || undefined,
  });
  if (ok) {
    showAddModal.value = false;
    Object.assign(addForm, {
      type: "http",
      host: "",
      port: 8080,
      username: "",
      password: "",
      country: "",
      name: "",
    });
    previewTest.value = null;
  }
  isSubmitting.value = false;
}

// ── Delete ────────────────────────────────────────────────────
function confirmDelete(proxy: ProxyItem) {
  deletingProxy.value = proxy;
  showDeleteModal.value = true;
}

async function executeDelete() {
  if (!deletingProxy.value) return;
  const ok = await deleteProxy(deletingProxy.value.id);
  if (ok) showDeleteModal.value = false;
}

// ── Bulk import callback ───────────────────────────────────────
function onBulkImported() {
  fetchProxies(buildParams());
}

// ── Init ──────────────────────────────────────────────────────
onMounted(() => fetchProxies(buildParams()));

const clearFilters = async () => {
  search.value = "";
  filterStatus.value = "all";
  filterType.value = "all";
  filterCountry.value = "all";
  currentPage.value = 1;
  await fetchProxies(buildParams());
};
</script>

<template>
  <AppDashboardLayout id="proxies" title="Proxies">
    <template #content>
      <div class="min-h-screen p-6">
        <div class="mx-auto max-w-7xl space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-slate-100 tracking-tight">
                Proxy Manager
              </h1>
              <p class="text-sm text-slate-500 mt-0.5">
                Manage your proxy list here
              </p>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                icon="i-heroicons-heart"
                color="neutral"
                variant="outline"
                size="md"
                :loading="isHealthChecking"
                @click="runHealthCheck"
              >
                <span class="hidden sm:inline">Health Check</span>
              </UButton>
              <UButton
                icon="i-heroicons-arrow-up-tray"
                color="neutral"
                variant="outline"
                size="md"
                @click="showBulkModal = true"
              >
                <span class="hidden sm:inline">Bulk Import</span>
              </UButton>
              <UButton
                icon="i-heroicons-plus"
                size="md"
                color="primary"
                class="text-white"
                @click="showAddModal = true"
              >
                <span class="hidden sm:inline">Add Proxy</span>
              </UButton>
            </div>
          </div>
          <!-- Stats bar -->

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              v-for="stat in statCards"
              :key="stat.label"
              class="bg-muted border rounded-xl p-4"
              :class="stat.border"
            >
              <p class="text-xs text-muted uppercase tracking-wide">
                {{ stat.label }}
              </p>
              <p class="text-2xl font-bold mt-1" :class="stat.color">
                {{ stat.value }}
              </p>
            </div>
          </div>

          <!-- Filters -->
          <UPageCard
            spotlight
            spotlight-color="info"
            title="Filter & Search"
            description="Filter proxy by status, country and type"
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
                placeholder="Search host / name..."
                class="flex-1"
                @input="debouncedFetch"
              />
              <USelect
                v-model="filterStatus"
                :items="statusOptions"
                placeholder="All status"
                class="w-full sm:w-44"
                @change="onFilterChange"
              />
              <USelect
                v-model="filterType"
                :items="typeOptions"
                placeholder="All type"
                class="w-full sm:w-44"
                @change="onFilterChange"
              />
              <USelect
                v-model="filterCountry"
                :items="countryOptions"
                placeholder="All country"
                class="w-full sm:w-44"
                @change="onFilterChange"
              />
            </div>
            <div class="mt-4 flex items-center justify-between">
              <p class="text-muted text-sm">
                Showing {{ proxies?.length }} of {{ meta.total }} proxies
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
              class="w-8 h-8 text-indigo-500 dark:text-indigo-400 animate-spin"
            />
          </div>

          <!-- Empty -->
          <div v-else-if="proxies.length === 0" class="text-center py-16">
            <UIcon
              name="i-heroicons-globe-alt"
              class="w-12 h-12 text-muted mx-auto mb-4"
            />
            <h3 class="text-muted font-medium mb-1">Not Proxy yet</h3>
            <p class="text-muted text-sm mb-4">
              Add proxies manually or bulk import
            </p>
            <div class="flex items-center justify-center gap-3">
              <UButton
                icon="i-heroicons-arrow-up-tray"
                variant="outline"
                color="neutral"
                size="md"
                @click="showBulkModal = true"
              >
                Bulk Import
              </UButton>
              <UButton
                icon="i-heroicons-plus"
                color="primary"
                class="text-white"
                size="md"
                @click="showAddModal = true"
              >
                Manual Add
              </UButton>
            </div>
          </div>

          <!-- Proxy table -->
          <div
            v-else
            class="bg-muted border border-muted rounded-xl overflow-hidden"
          >
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-muted">
                    <th
                      class="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Proxy
                    </th>
                    <th
                      class="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Type
                    </th>
                    <th
                      class="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      GEO
                    </th>
                    <th
                      class="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Status
                    </th>
                    <th
                      class="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Response
                    </th>
                    <th
                      class="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide"
                    >
                      Last Test
                    </th>
                    <th class="px-4 py-3" />
                  </tr>
                </thead>
                <tbody class="divide-y divide-muted">
                  <AppProxyRow
                    v-for="proxy in proxies"
                    :key="proxy.id"
                    :proxy="proxy"
                    :is-acting="!!isActing[proxy.id]"
                    @test="testProxy(proxy.id)"
                    @delete="confirmDelete(proxy)"
                  />
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div
              v-if="meta.totalPages > 1"
              class="flex justify-center py-4 border-t border-muted"
            >
              <UPagination
                v-model:page="currentPage"
                :total="meta.total"
                :items-per-page="meta.limit"
                @update:page="onPageChange"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- ── Add Proxy Modal ───────────────────────────────── -->
      <UModal v-model:open="showAddModal" :ui="{ wrapper: 'sm:max-w-lg' }">
        <template #content>
          <div class="p-6 space-y-5">
            <div>
              <h3 class="font-semiboldtext-lg">Add Proxy</h3>
              <p class="text-sm text-muted mt-0.5">
                Proxy will be tested automatically after added
              </p>
            </div>

            <UForm
              :schema="addSchema"
              :state="addForm"
              @submit="handleAddProxy"
              class="space-y-4"
            >
              <div class="grid grid-cols-2 gap-3">
                <UFormField
                  label="Type"
                  name="type"
                  required
                  class="col-span-1"
                >
                  <USelect
                    v-model="addForm.type"
                    :items="proxyTypeOptions"
                    class="w-full h-10"
                  />
                </UFormField>
                <UFormField
                  label="Country (ISO)"
                  name="country"
                  required
                  class="col-span-1"
                >
                  <USelect
                    v-model="addForm.country"
                    :items="
                      COUNTRY_LIST.map((item) => ({
                        label: item.name,
                        value: item.code,
                      }))
                    "
                    class="w-full h-10"
                  />
                </UFormField>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <UFormField
                  label="Host"
                  name="host"
                  required
                  class="col-span-2"
                >
                  <UInput
                    v-model="addForm.host"
                    placeholder="192.168.1.1 atau proxy.example.com"
                    class="w-full"
                  />
                </UFormField>
                <UFormField
                  label="Port"
                  name="port"
                  required
                  class="col-span-1"
                >
                  <UInput
                    v-model.number="addForm.port"
                    type="number"
                    placeholder="8080"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <UFormField label="Username" name="username">
                  <UInput
                    v-model="addForm.username"
                    placeholder="Opsional"
                    autocomplete="off"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Password" name="password">
                  <UInput
                    v-model="addForm.password"
                    type="password"
                    placeholder="Opsional"
                    autocomplete="off"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <UFormField label="Name (optional)" name="name">
                <UInput
                  v-model="addForm.name"
                  placeholder="Example: Proxy US Residential"
                  class="w-full"
                />
              </UFormField>

              <!-- Test result preview -->
              <div
                v-if="previewTest"
                class="flex items-center gap-2 p-3 rounded-lg text-sm"
                :class="
                  previewTest.success
                    ? 'bg-primary/10 border border-primary/20 text-primary'
                    : 'bg-error/10 border border-error/20 text-error'
                "
              >
                <UIcon
                  :name="
                    previewTest.success
                      ? 'i-heroicons-check-circle'
                      : 'i-heroicons-x-circle'
                  "
                  class="w-4 h-4 shrink-0"
                />
                <span>
                  {{
                    previewTest.success
                      ? `IP: ${previewTest.ipReturned} · ${previewTest.responseTime}ms`
                      : `Failed: ${previewTest.error}`
                  }}
                </span>
              </div>

              <div class="flex gap-2 justify-between pt-1">
                <UButton
                  type="button"
                  variant="outline"
                  color="neutral"
                  icon="i-heroicons-signal"
                  :loading="isTesting"
                  size="md"
                  @click="handlePreviewTest"
                >
                  Test First
                </UButton>
                <div class="flex gap-2">
                  <UButton
                    type="button"
                    variant="ghost"
                    color="neutral"
                    size="md"
                    @click="showAddModal = false"
                  >
                    Cancel
                  </UButton>
                  <UButton
                    type="submit"
                    size="md"
                    :loading="isSubmitting"
                    class="tetxt-white"
                  >
                    Save
                  </UButton>
                </div>
              </div>
            </UForm>
          </div>
        </template>
      </UModal>

      <!-- ── Bulk Import Modal ─────────────────────────────── -->
      <AppProxyBulkImportModal
        v-model:open="showBulkModal"
        @imported="onBulkImported"
      />

      <!-- ── Delete Confirm Modal ──────────────────────────── -->
      <UModal v-model:open="showDeleteModal">
        <template #content>
          <div class="p-6 space-y-4">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center shrink-0"
              >
                <UIcon name="i-heroicons-trash" class="w-5 h-5 text-error" />
              </div>
              <div>
                <h3 class="font-semibold">Delete Proxy?</h3>
                <p class="text-sm text-muted">
                  {{ deletingProxy?.host }}:{{ deletingProxy?.port }} will be
                  deleted.
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
                :loading="!!isActing[deletingProxy?.id ?? '']"
                size="md"
                class="text-white"
                @click="executeDelete"
              >
                Delete
              </UButton>
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </AppDashboardLayout>
</template>

<style scoped></style>

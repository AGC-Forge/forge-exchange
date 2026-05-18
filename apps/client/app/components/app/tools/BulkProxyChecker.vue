<script lang="ts" setup>
interface ProxyResult {
  index: number;
  raw: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  status: "valid" | "error" | "not_supported";
  responseTime?: number;
  error?: string;
  ip?: string;
  country?: string;
  proxyType?: string;
  proxyTypeName?: string;
  countryCode?: string;
  isResidential?: boolean;
  isMobile?: boolean;
  isISP?: boolean;
  isDatacenter?: boolean;
  fraudScore?: number;
}

const toast = useToast();

const form = reactive({
  proxyType: "http" as string,
  formatter: "user:pass@host:port" as string,
  proxies: "",
});

const router = useRouter();
const results = ref<ProxyResult[]>([]);
const isSubmitting = ref(false);
const hasChecked = ref(false);
const checkProgress = ref(0);
const showAlertExit = ref(false);

const proxyTypeOptions = [
  { label: "HTTP", value: "http" },
  { label: "HTTPS", value: "https" },
  { label: "SOCKS5", value: "socks5" },
  { label: "Residential", value: "residential" },
  { label: "Mobile", value: "mobile" },
  { label: "ISP", value: "isp" },
  { label: "Rotating", value: "rotating" },
  { label: "Auto Detect", value: "auto" },
];

const formatterOptions = [
  { label: "user:pass@host:port", value: "user:pass@host:port" },
  { label: "user:pass:host:port (colon)", value: "user:pass:host:port" },
  { label: "host:port@user:pass", value: "host:port@user:pass" },
  { label: "host:port:user:pass", value: "host:port:user:pass" },
  { label: "host:port (only)", value: "host:port" },
  {
    label: "user:pass@host:port:country",
    value: "user:pass@host:port:country",
  },
  {
    label: "user:pass:host:port:country",
    value: "user:pass:host:port:country",
  },
];

const proxyList = computed(() =>
  form.proxies
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0),
);

const validCount = computed(
  () => results.value.filter((r) => r.status === "valid").length,
);
const errorCount = computed(
  () => results.value.filter((r) => r.status === "error").length,
);
const notSupportedCount = computed(
  () => results.value.filter((r) => r.status === "not_supported").length,
);

// Statistik berdasarkan tipe proxy
const residentialCount = computed(
  () =>
    results.value.filter((r) => r.isResidential && r.status === "valid").length,
);
const mobileCount = computed(
  () => results.value.filter((r) => r.isMobile && r.status === "valid").length,
);
const ispCount = computed(
  () => results.value.filter((r) => r.isISP && r.status === "valid").length,
);
const datacenterCount = computed(
  () =>
    results.value.filter((r) => r.isDatacenter && r.status === "valid").length,
);

function statusColor(status: ProxyResult["status"]) {
  switch (status) {
    case "valid":
      return "success";
    case "not_supported":
      return "warning";
    case "error":
      return "error";
    default:
      return "neutral";
  }
}

function statusLabel(status: ProxyResult["status"]) {
  switch (status) {
    case "valid":
      return "Valid";
    case "not_supported":
      return "Not Supported";
    case "error":
      return "Error";
    default:
      return status;
  }
}

function statusIcon(status: ProxyResult["status"]) {
  switch (status) {
    case "valid":
      return "i-lucide-check-circle";
    case "not_supported":
      return "i-lucide-alert-circle";
    case "error":
      return "i-lucide-x-circle";
    default:
      return "i-lucide-circle";
  }
}

function getProxyTypeBadge(proxyTypeName?: string) {
  const types: Record<string, { color: string; label: string }> = {
    Residential: { color: "success", label: "🏠 Residential" },
    Mobile: { color: "info", label: "📱 Mobile" },
    ISP: { color: "warning", label: "🏢 ISP" },
    Datacenter: { color: "error", label: "🖥️ Datacenter" },
    VPN: { color: "neutral", label: "🔒 VPN" },
    Tor: { color: "neutral", label: "🧅 Tor" },
    Public: { color: "neutral", label: "🌐 Public" },
    Web: { color: "neutral", label: "🌍 Web" },
  };

  if (!proxyTypeName) return { color: "neutral", label: "❓ Unknown" };

  for (const [key, value] of Object.entries(types)) {
    if (proxyTypeName.includes(key)) return value;
  }

  return { color: "neutral", label: proxyTypeName };
}

function formatProxyCell(row: ProxyResult) {
  if (!row.host) return row.raw;
  const auth = row.username
    ? `${row.username}:${row.password ? "***" : ""}@`
    : "";
  return `${auth}${row.host}:${row.port}`;
}

function formatLocationCell(row: ProxyResult) {
  if (row.status === "valid") {
    const parts = [];
    if (row.ip) parts.push(row.ip);
    if (row.country) parts.push(row.country);
    if (row.countryCode) parts.push(`(${row.countryCode})`);
    return parts.join(" ") || "-";
  }
  return row.error || "-";
}

function formatResponseTime(row: ProxyResult) {
  if (row.responseTime != null) {
    if (row.responseTime < 1000) {
      return `${row.responseTime}ms`;
    }
    return `${(row.responseTime / 1000).toFixed(1)}s`;
  }
  return "-";
}

function getFraudScoreBadge(score?: number) {
  if (score === undefined) return null;
  if (score <= 1) return { color: "success", label: "Low Risk" };
  if (score <= 2) return { color: "warning", label: "Medium Risk" };
  return { color: "error", label: "High Risk" };
}

async function onSubmit() {
  results.value = [];
  hasChecked.value = false;
  checkProgress.value = 0;

  if (proxyList.value.length === 0) {
    toast.add({
      title: "No proxies",
      description: "Please enter at least one proxy",
      color: "warning",
      icon: "i-lucide-alert-circle",
    });
    return;
  }

  if (proxyList.value.length > 100) {
    toast.add({
      title: "Too many proxies",
      description: "Maximum 100 proxies allowed",
      color: "error",
      icon: "i-lucide-x-circle",
    });
    return;
  }

  try {
    isSubmitting.value = true;

    const res = await $fetch<{
      success: boolean;
      message: string;
      data: {
        total: number;
        valid: number;
        error: number;
        notSupported: number;
        proxyTypeStats: {
          residential: number;
          mobile: number;
          isp: number;
          datacenter: number;
          unknown: number;
        };
        results: ProxyResult[];
      };
    }>("/api/tools/proxy-checker", {
      method: "POST",
      body: {
        proxyType: form.proxyType,
        formatter: form.formatter,
        proxies: proxyList.value,
      },
    });

    results.value = res.data.results;
    hasChecked.value = true;

    const { valid, error, notSupported } = res.data;
    toast.add({
      title: "Check Complete",
      description: `${valid} valid, ${error} error, ${notSupported} not supported`,
      color: valid > 0 ? "success" : error > 0 ? "error" : "warning",
      icon: "i-lucide-check-circle",
    });
  } catch (err: any) {
    toast.add({
      title: "Check Failed",
      description: err?.data?.statusMessage || err?.message || "Unknown error",
      color: "error",
      icon: "i-lucide-x-circle",
    });
  } finally {
    isSubmitting.value = false;
    checkProgress.value = 100;
  }
}

const columns = [
  { accessorKey: "index", header: "#", class: "w-12" },
  { accessorKey: "status", header: "Status", class: "w-28" },
  { accessorKey: "proxy", header: "Proxy", class: "min-w-[200px]" },
  { accessorKey: "type", header: "Type", class: "w-32" },
  { accessorKey: "responseTime", header: "Response", class: "w-20" },
  { accessorKey: "location", header: "IP / Location", class: "min-w-[150px]" },
  { accessorKey: "fraudScore", header: "Risk", class: "w-24" },
];

function downloadValidProxies() {
  const valid = results.value.filter((r) => r.status === "valid");
  if (valid.length === 0) return;

  const lines = valid.map((r) => {
    const auth = r.username ? `${r.username}:${r.password || ""}@` : "";
    return `${auth}${r.host}:${r.port}`;
  });

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `valid-proxies-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);

  toast.add({
    title: "Downloaded",
    description: `${valid.length} valid proxies exported`,
    color: "success",
    icon: "i-lucide-download",
  });
}

async function copyAllProxies() {
  try {
    const text = results.value
      .filter((r) => r.status === "valid")
      .map((r) => {
        const auth = r.username ? `${r.username}:${r.password || ""}@` : "";
        return `${auth}${r.host}:${r.port}`;
      })
      .join("\n");

    await navigator.clipboard.writeText(text);
    toast.add({
      title: "Copied",
      description: `${results.value.filter((r) => r.status === "valid").length} valid proxies copied`,
      color: "success",
      icon: "i-lucide-check",
    });
  } catch (error) {
    toast.add({
      title: "Copy Failed",
      description: error instanceof Error ? error.message : "Unknown error",
      color: "error",
      icon: "i-lucide-x-circle",
    });
  }
}

onBeforeRouteLeave((to, from) => {
  if (isSubmitting.value) {
    showAlertExit.value = true;
  }
});
</script>

<template>
  <div class="space-y-6">
    <!-- Summary Stats -->
    <div v-if="hasChecked">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <div class="rounded-lg border border-default bg-elevated px-4 py-3">
          <div class="text-xs font-medium text-muted uppercase tracking-wider">
            Total
          </div>
          <div class="mt-1 text-2xl font-bold text-default">
            {{ results.length }}
          </div>
        </div>
        <div
          class="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3"
        >
          <div
            class="text-xs font-medium text-green-500 uppercase tracking-wider"
          >
            Valid
          </div>
          <div class="mt-1 text-2xl font-bold text-green-500">
            {{ validCount }}
          </div>
        </div>
        <div
          class="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3"
        >
          <div
            class="text-xs font-medium text-yellow-500 uppercase tracking-wider"
          >
            Not Supported
          </div>
          <div class="mt-1 text-2xl font-bold text-yellow-500">
            {{ notSupportedCount }}
          </div>
        </div>
        <div class="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <div
            class="text-xs font-medium text-red-500 uppercase tracking-wider"
          >
            Error
          </div>
          <div class="mt-1 text-2xl font-bold text-red-500">
            {{ errorCount }}
          </div>
        </div>
      </div>

      <!-- Proxy Type Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-2">
        <div
          v-if="residentialCount > 0"
          class="rounded-lg bg-success/10 px-3 py-2 text-center"
        >
          <span class="text-xs text-muted">🏠 Residential</span>
          <div class="text-lg font-bold text-success">
            {{ residentialCount }}
          </div>
        </div>
        <div
          v-if="mobileCount > 0"
          class="rounded-lg bg-info/10 px-3 py-2 text-center"
        >
          <span class="text-xs text-muted">📱 Mobile</span>
          <div class="text-lg font-bold text-info">{{ mobileCount }}</div>
        </div>
        <div
          v-if="ispCount > 0"
          class="rounded-lg bg-warning/10 px-3 py-2 text-center"
        >
          <span class="text-xs text-muted">🏢 ISP</span>
          <div class="text-lg font-bold text-warning">{{ ispCount }}</div>
        </div>
        <div
          v-if="datacenterCount > 0"
          class="rounded-lg bg-error/10 px-3 py-2 text-center"
        >
          <span class="text-xs text-muted">🖥️ Datacenter</span>
          <div class="text-lg font-bold text-error">{{ datacenterCount }}</div>
        </div>
      </div>
    </div>

    <!-- Form -->
    <UPageCard variant="subtle">
      <UForm :state="form" class="space-y-5" @submit.prevent="onSubmit">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField label="Proxy Type" name="proxyType" required>
            <USelect
              v-model="form.proxyType"
              :items="proxyTypeOptions"
              placeholder="Select type..."
              icon="i-lucide-shield"
              class="w-full uppercase"
            />
          </UFormField>

          <UFormField label="Format" name="formatter" required>
            <USelect
              v-model="form.formatter"
              :items="formatterOptions"
              placeholder="Select format..."
              icon="i-lucide-code-2"
              class="w-full uppercase"
            />
          </UFormField>
        </div>

        <UFormField label="Proxy List" name="proxies">
          <UTextarea
            v-model="form.proxies"
            placeholder="username:password@1.2.3.4:8080&#10;1.2.3.4:8080:user:pass&#10;1.2.3.4:8080&#10;&#10;Maximum 100 proxies"
            :rows="8"
            :maxrows="16"
            class="w-full font-mono text-xs"
            autoresize
          />
          <template #hint>
            <div class="flex justify-between items-center w-full gap-2">
              <span>One proxy per line</span>
              <span
                :class="{
                  'text-red-500': proxyList.length > 100,
                  'text-green-500':
                    proxyList.length > 0 && proxyList.length <= 100,
                }"
              >
                {{ proxyList.length }} / 100 proxies
              </span>
            </div>
          </template>
        </UFormField>

        <div
          class="flex items-center flex-col md:flex-row justify-center md:justify-between gap-5"
        >
          <div class="flex items-center gap-2 text-xs text-muted">
            <UIcon name="i-lucide-info" class="shrink-0" />
            <span class="text-xs"
              >Testing TCP connection & proxy classification</span
            >
          </div>
          <UButton
            type="submit"
            variant="solid"
            color="primary"
            class="text-white"
            :loading="isSubmitting"
            :disabled="isSubmitting"
            icon="i-lucide-search"
            size="md"
          >
            {{
              isSubmitting
                ? `Checking (${proxyList.length})...`
                : "Check Proxies"
            }}
          </UButton>
        </div>
      </UForm>
    </UPageCard>

    <!-- Results Table -->
    <div
      v-if="hasChecked && results.length > 0"
      class="rounded-xl border border-default overflow-hidden"
    >
      <div
        class="flex flex-wrap items-center gap-3 border-b border-default bg-elevated px-4 py-3"
      >
        <UIcon name="i-lucide-list" class="text-primary" />
        <span class="font-semibold text-default">Results</span>
        <span class="text-sm text-muted">
          {{ results.length }} proxies checked
        </span>

        <div class="flex flex-wrap items-center gap-2 ms-auto">
          <UButton
            v-if="validCount > 0"
            size="sm"
            variant="soft"
            color="success"
            icon="i-lucide-download"
            @click="downloadValidProxies"
          >
            <span class="hidden md:inline-block">Valid ({{ validCount }})</span>
          </UButton>
          <UButton
            v-if="validCount > 0"
            size="sm"
            variant="soft"
            color="neutral"
            icon="i-lucide-copy"
            @click="copyAllProxies"
          >
            <span class="hidden md:inline-block">Copy Valid</span>
          </UButton>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-default bg-muted">
            <tr>
              <th
                class="w-12 px-3 py-2.5 text-left text-xs font-semibold text-muted"
              >
                #
              </th>
              <th
                class="w-28 px-3 py-2.5 text-left text-xs font-semibold text-muted"
              >
                Status
              </th>
              <th
                class="min-w-50 px-3 py-2.5 text-left text-xs font-semibold text-muted"
              >
                Proxy
              </th>
              <th
                class="w-32 px-3 py-2.5 text-left text-xs font-semibold text-muted"
              >
                Type
              </th>
              <th
                class="w-20 px-3 py-2.5 text-left text-xs font-semibold text-muted"
              >
                Response
              </th>
              <th
                class="min-w-37.5 px-3 py-2.5 text-left text-xs font-semibold text-muted"
              >
                IP / Location
              </th>
              <th
                class="w-24 px-3 py-2.5 text-left text-xs font-semibold text-muted"
              >
                Risk Score
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="row in results"
              :key="row.index"
              class="hover:bg-(--ui-bg-hover) transition-colors"
            >
              <td class="px-3 py-2 text-muted">{{ row.index }}</td>
              <td class="px-3 py-2">
                <UBadge
                  :color="statusColor(row.status)"
                  variant="subtle"
                  class="font-medium"
                >
                  <UIcon :name="statusIcon(row.status)" class="me-1" />
                  {{ statusLabel(row.status) }}
                </UBadge>
              </td>
              <td class="px-3 py-2 font-mono text-xs text-default">
                <div class="max-w-xs truncate" :title="formatProxyCell(row)">
                  {{ formatProxyCell(row) }}
                </div>
              </td>
              <td class="px-3 py-2">
                <div v-if="row.status === 'valid' && row.proxyTypeName">
                  <UBadge
                    :class="
                      cn(`bg-${getProxyTypeBadge(row.proxyTypeName).color}`)
                    "
                    variant="soft"
                    size="sm"
                  >
                    {{ getProxyTypeBadge(row.proxyTypeName).label }}
                  </UBadge>
                </div>
                <span v-else class="text-muted text-xs">-</span>
              </td>
              <td class="px-3 py-2">
                <span
                  v-if="row.responseTime != null"
                  class="font-mono"
                  :class="{
                    'text-green-500': row.responseTime < 1000,
                    'text-yellow-500':
                      row.responseTime >= 1000 && row.responseTime < 3000,
                    'text-red-500': row.responseTime >= 3000,
                  }"
                >
                  {{ formatResponseTime(row) }}
                </span>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="px-3 py-2 text-muted text-xs">
                <div v-if="row.status === 'valid'">
                  <div>{{ row.ip || "-" }}</div>
                  <div v-if="row.country" class="text-muted">
                    {{ row.country }}
                    {{ row.countryCode ? `(${row.countryCode})` : "" }}
                  </div>
                </div>
                <div v-else class="text-error">
                  {{ row.error?.substring(0, 50) || "-" }}
                </div>
              </td>
              <td class="px-3 py-2">
                <div
                  v-if="row.status === 'valid' && row.fraudScore !== undefined"
                >
                  <UBadge
                    :class="
                      cn(`bg-${getFraudScoreBadge(row.fraudScore)?.color}`)
                    "
                    variant="subtle"
                    size="sm"
                  >
                    {{ getFraudScoreBadge(row.fraudScore)?.label || "-" }}
                  </UBadge>
                  <div class="text-xs text-muted mt-1">
                    Score: {{ row.fraudScore }}/4
                  </div>
                </div>
                <span v-else class="text-muted text-xs">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="hasChecked && results.length === 0"
      class="flex flex-col items-center justify-center rounded-xl border border-dashed border-default py-16 text-center"
    >
      <UIcon
        name="i-lucide-check-circle"
        class="text-4xl text-green-500 mb-3"
      />
      <p class="text-lg font-semibold text-default">No proxies found</p>
      <p class="mt-1 text-sm text-muted">Check your format and try again</p>
    </div>

    <AlertDialog
      :open="showAlertExit"
      title="Confirm Exit"
      message="Are you sure you want to exit? You have unsaved changes!"
      type="warning"
      :isAction="true"
      labelAction="Exit"
      @onclose="showAlertExit = false"
      @onaction="
        () => {
          showAlertExit = false;
          router.push('/app/tools');
        }
      "
    />
  </div>
</template>

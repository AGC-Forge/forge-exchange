<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Integrations",
  description: "Manage your integrations to connect with external services.",
  robots: "noindex, nofollow",
});
interface Integration {
  id: string;
  type: string;
  name: string;
  isActive: boolean;
  isHealthy: boolean | null;
  lastTestedAt: string | null;
  createdAt: string;
}

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  placeholder: string;
  required: boolean;
  hint?: string;
}

interface IntegrationDef {
  type: string;
  name: string;
  description: string;
  icon: string;
  badge?: string; // e.g. "Popular", "Recommended"
  badgeColor?: string;
  category: "proxy" | "antidetect" | "captcha";
  color: string;
  docsUrl?: string; // link ke docs provider
  fields: FieldDef[];
  status: "active" | "inactive";
}

const INTEGRATION_CATALOG: IntegrationDef[] = [
  // Proxy
  {
    type: "brightdata",
    name: "Bright Data",
    description:
      "Residential, datacenter & mobile proxy terbesar di dunia. 72M+ IP.",
    icon: "i-heroicons-globe-americas",
    badge: "Popular",
    badgeColor: "emerald",
    category: "proxy",
    color: "emerald",
    docsUrl: "https://docs.brightdata.com/api-reference",
    status: "active",
    fields: [
      {
        key: "username",
        label: "Username",
        type: "text",
        placeholder: "brd-customer-XXX",
        required: true,
        hint: "Format: brd-customer-{customer_id}-zone-{zone}",
      },
      {
        key: "password",
        label: "Password",
        type: "password",
        placeholder: "Bright Data password",
        required: true,
      },
      {
        key: "host",
        label: "Proxy Host",
        type: "text",
        placeholder: "brd.superproxy.io",
        required: true,
      },
      {
        key: "port",
        label: "Proxy Port",
        type: "text",
        placeholder: "22225",
        required: true,
      },
    ],
  },
  {
    type: "oxylabs",
    name: "Oxylabs",
    description:
      "Premium residential & datacenter proxy. 100M+ IP, 195 countries.",
    icon: "i-heroicons-server",
    category: "proxy",
    color: "sky",
    docsUrl: "https://developers.oxylabs.io",
    status: "active",
    fields: [
      {
        key: "username",
        label: "Username",
        type: "text",
        placeholder: "customer_username",
        required: true,
      },
      {
        key: "password",
        label: "Password",
        type: "password",
        placeholder: "Oxylabs password",
        required: true,
      },
      {
        key: "host",
        label: "Proxy Host",
        type: "text",
        placeholder: "pr.oxylabs.io",
        required: true,
      },
      {
        key: "port",
        label: "Port",
        type: "text",
        placeholder: "7777",
        required: true,
      },
    ],
  },
  {
    type: "iproyal",
    name: "IPRoyal",
    description: "Residential & mobile proxy terjangkau. Pay-as-you-go.",
    icon: "i-heroicons-signal",
    category: "proxy",
    color: "violet",
    docsUrl: "https://iproyal.com/docs",
    status: "active",
    fields: [
      {
        key: "username",
        label: "Username",
        type: "text",
        placeholder: "IPRoyal username",
        required: true,
      },
      {
        key: "password",
        label: "Password",
        type: "password",
        placeholder: "IPRoyal password",
        required: true,
      },
      {
        key: "host",
        label: "Proxy Host",
        type: "text",
        placeholder: "geo.iproyal.com",
        required: true,
      },
      {
        key: "port",
        label: "Port",
        type: "text",
        placeholder: "32325",
        required: true,
      },
    ],
  },
  {
    type: "smartproxy",
    name: "Smartproxy",
    description: "Residential proxy 65M+ IP. Mudah dipakai, harga kompetitif.",
    icon: "i-heroicons-wifi",
    category: "proxy",
    color: "teal",
    docsUrl: "https://help.decodo.com/docs/introduction",
    status: "active",
    fields: [
      {
        key: "username",
        label: "Username",
        type: "text",
        placeholder: "Smartproxy username",
        required: true,
      },
      {
        key: "password",
        label: "Password",
        type: "password",
        placeholder: "Smartproxy password",
        required: true,
      },
      {
        key: "host",
        label: "Proxy Host",
        type: "text",
        placeholder: "gate.smartproxy.com",
        required: true,
      },
      {
        key: "port",
        label: "Port",
        type: "text",
        placeholder: "7000",
        required: true,
      },
    ],
  },
  {
    type: "mobile_proxy",
    name: "Mobile Proxy (4G/5G)",
    description: "Provider mobile proxy 4G/5G custom — input endpoint sendiri.",
    icon: "i-heroicons-device-phone-mobile",
    category: "proxy",
    color: "blue",
    status: "active",
    fields: [
      {
        key: "host",
        label: "Proxy Host",
        type: "text",
        placeholder: "proxy.myprovider.com",
        required: true,
      },
      {
        key: "port",
        label: "Port",
        type: "text",
        placeholder: "8080",
        required: true,
      },
      {
        key: "username",
        label: "Username",
        type: "text",
        placeholder: "Username (opsional)",
        required: false,
      },
      {
        key: "password",
        label: "Password",
        type: "password",
        placeholder: "Password (opsional)",
        required: false,
      },
      {
        key: "rotateUrl",
        label: "Rotate URL",
        type: "url",
        placeholder: "http://... (untuk rotate IP)",
        required: false,
        hint: "URL dipanggil untuk rotate IP sebelum setiap session",
      },
    ],
  },
  {
    type: "socks5_proxy",
    name: "SOCKS5 / HTTP Proxy",
    description: "Input SOCKS5 atau HTTP proxy manual dari provider mana saja.",
    icon: "i-heroicons-arrows-right-left",
    category: "proxy",
    color: "slate",
    status: "active",
    fields: [
      {
        key: "host",
        label: "Host",
        type: "text",
        placeholder: "proxy.example.com atau IP",
        required: true,
      },
      {
        key: "port",
        label: "Port",
        type: "text",
        placeholder: "1080",
        required: true,
      },
      {
        key: "username",
        label: "Username",
        type: "text",
        placeholder: "Username (opsional)",
        required: false,
      },
      {
        key: "password",
        label: "Password",
        type: "password",
        placeholder: "Password (opsional)",
        required: false,
      },
      {
        key: "proxyType",
        label: "Tipe Proxy",
        type: "text",
        placeholder:
          "socks5 / http / https / residential / mobile / isp / rotating",
        required: true,
        hint: "Isi: socks5, http, https, residential, mobile, isp, or rotating",
      },
    ],
  },
  {
    type: "rotating_proxy",
    name: "Rotating Proxy",
    description:
      "Proxy dengan rotasi IP otomatis per request atau per interval.",
    icon: "i-heroicons-arrow-path",
    category: "proxy",
    color: "amber",
    status: "active",
    fields: [
      {
        key: "host",
        label: "Gateway Host",
        type: "text",
        placeholder: "rotate.example.com",
        required: true,
      },
      {
        key: "port",
        label: "Port",
        type: "text",
        placeholder: "8080",
        required: true,
      },
      {
        key: "username",
        label: "Username",
        type: "text",
        placeholder: "Username",
        required: false,
      },
      {
        key: "password",
        label: "Password",
        type: "password",
        placeholder: "Password",
        required: false,
      },
      {
        key: "rotationInterval",
        label: "Interval (detik)",
        type: "text",
        placeholder: "60",
        required: false,
        hint: "Interval rotasi IP dalam detik",
      },
    ],
  },
  {
    type: "residential_proxy",
    name: "Residential Proxy",
    description: "Proxy with resident IP. Best for anti-DDoS.",
    icon: "material-symbols:home-work-outline-rounded",
    category: "proxy",
    color: "green",
    status: "active",
    fields: [
      {
        key: "host",
        label: "Proxy Host",
        type: "text",
        placeholder: "proxy.myprovider.com",
        required: true,
      },
      {
        key: "port",
        label: "Port",
        type: "text",
        placeholder: "8080",
        required: true,
      },
      {
        key: "username",
        label: "Username",
        type: "text",
        placeholder: "Username (opsional)",
        required: false,
      },
      {
        key: "password",
        label: "Password",
        type: "password",
        placeholder: "Password (opsional)",
        required: false,
      },
    ],
  },
  // Antidetect
  {
    type: "gologin",
    name: "GoLogin",
    description:
      "Cloud antidetect browser dengan Node.js SDK resmi. Mudah di-setup.",
    icon: "i-heroicons-globe-alt",
    badge: "Cloud",
    badgeColor: "indigo",
    category: "antidetect",
    color: "indigo",
    docsUrl: "https://gologin.com/docs/api-reference/introduction/quickstart",
    status: "active",
    fields: [
      {
        key: "apiKey",
        label: "API Token",
        type: "password",
        placeholder: "GoLogin API token dari dashboard",
        required: true,
        hint: "Dashboard GoLogin → Settings → API → Copy token",
      },
    ],
  },
  {
    type: "adspower",
    name: "AdsPower",
    description: "Local API di VPS. Stabil untuk automation di scale besar.",
    icon: "i-heroicons-computer-desktop",
    badge: "Local",
    badgeColor: "amber",
    category: "antidetect",
    color: "amber",
    docsUrl: "https://localapi-doc-en.adspower.com",
    status: "active",
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "AdsPower API key",
        required: true,
        hint: "AdsPower → Settings → API Management → Generate Key",
      },
      {
        key: "apiUrl",
        label: "Local API URL",
        type: "url",
        placeholder: "http://local.adspower.net:20725",
        required: true,
        hint: "Default port 20725, sesuaikan jika berbeda di VPS",
      },
    ],
  },
  {
    type: "multilogin",
    name: "Multilogin",
    description:
      "Antidetect browser paling mature. Best untuk Cloudflare & DataDome.",
    icon: "i-heroicons-shield-check",
    badge: "Enterprise",
    badgeColor: "purple",
    category: "antidetect",
    color: "purple",
    docsUrl: "https://multilogin.com",
    status: "inactive",
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "Multilogin API key",
        required: true,
      },
      {
        key: "workspaceId",
        label: "Workspace ID",
        type: "text",
        placeholder: "Workspace ID dari dashboard",
        required: true,
        hint: "Dashboard Multilogin → Settings → Workspace ID",
      },
    ],
  },
  {
    type: "dolphin",
    name: "Dolphin{anty}",
    description: "Local AppImage. Cost-effective dengan fitur lengkap.",
    icon: "i-heroicons-finger-print",
    badge: "Local",
    badgeColor: "cyan",
    category: "antidetect",
    color: "cyan",
    docsUrl: "https://help.dolphin-anty.com/",
    status: "inactive",
    fields: [
      {
        key: "apiKey",
        label: "API Token",
        type: "password",
        placeholder: "Dolphin{anty} API token",
        required: true,
        hint: "Dashboard Dolphin{anty} → API → Generate Token",
      },
    ],
  },
  {
    type: "nstbrowser",
    name: "Nstbrowser",
    description:
      "Dibangun khusus untuk automation. Support Docker & API v2 lengkap.",
    icon: "i-heroicons-cpu-chip",
    badge: "Docker",
    badgeColor: "green",
    category: "antidetect",
    color: "green",
    docsUrl: "https://apidocs.nstbrowser.io",
    status: "inactive",
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "Nstbrowser API key",
        required: true,
        hint: "Nstbrowser → Account → API Key → Generate",
      },
      {
        key: "apiUrl",
        label: "Local API URL",
        type: "url",
        placeholder: "http://localhost:8848",
        required: false,
        hint: "Default port 8848. Kosongkan jika pakai port default.",
      },
    ],
  },
  // Captcha
  {
    type: "capmonster",
    name: "CapMonster Cloud",
    description:
      "Solve reCAPTCHA, hCaptcha, Cloudflare Turnstile secara otomatis.",
    icon: "i-heroicons-puzzle-piece",
    badge: "Recommended",
    badgeColor: "red",
    category: "captcha",
    color: "red",
    docsUrl: "https://docs.capmonster.cloud",
    status: "active",
    fields: [
      {
        key: "apiKey",
        label: "Client Key",
        type: "password",
        placeholder: "CapMonster client key",
        required: true,
        hint: "Dashboard CapMonster → Settings → Client Key",
      },
    ],
  },
  {
    type: "twocaptcha",
    name: "2Captcha",
    description:
      "Solve reCAPTCHA v2/v3, hCaptcha, image CAPTCHA & lebih banyak.",
    icon: "i-heroicons-key",
    category: "captcha",
    color: "orange",
    docsUrl: "https://2captcha.com/api-docs",
    status: "active",
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "2Captcha API key",
        required: true,
        hint: "2Captcha dashboard → Settings → API Key",
      },
    ],
  },
  {
    type: "anticaptcha",
    name: "Anti-Captcha",
    description:
      "Solve reCAPTCHA, hCaptcha, GeeTest, dan banyak jenis CAPTCHA.",
    icon: "i-heroicons-no-symbol",
    category: "captcha",
    color: "yellow",
    docsUrl: "https://anti-captcha.com/apidoc",
    status: "active",
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "Anti-Captcha API key",
        required: true,
        hint: "Anti-Captcha → Settings → Your API Key",
      },
    ],
  },
  {
    type: "turnstile",
    name: "Cloudflare Turnstile",
    description:
      "Solve Cloudflare Turnstile challenge secara otomatis via API.",
    icon: "i-heroicons-cloud",
    category: "captcha",
    color: "orange",
    docsUrl: "https://developers.cloudflare.com/turnstile",
    status: "active",
    fields: [
      {
        key: "apiKey",
        label: "Solver API Key",
        type: "password",
        placeholder: "API key dari CapMonster / 2Captcha",
        required: true,
        hint: "Gunakan API key dari CapMonster atau 2Captcha yang support Turnstile",
      },
      {
        key: "solverType",
        label: "Solver Backend",
        type: "text",
        placeholder: "capmonster / twocaptcha / anticaptcha",
        required: true,
        hint: "Pilih backend yang dipakai: capmonster, twocaptcha, atau anticaptcha",
      },
    ],
  },
];

const categories = [
  { id: "proxy", label: "Proxy Providers", icon: "i-heroicons-globe-alt" },
  {
    id: "antidetect",
    label: "Antidetect Browser",
    icon: "i-heroicons-shield-check",
  },
  { id: "captcha", label: "CAPTCHA Solver", icon: "i-heroicons-puzzle-piece" },
] as const;

const integrations = ref<Integration[]>([]);
const isLoading = ref(false);
const isSaving = ref(false);
const isTesting = ref<Record<string, boolean>>({});
const isDeleting = ref<Record<string, boolean>>({});
const showModal = ref(false);
const selectedDef = ref<IntegrationDef | null>(null);
const editingId = ref<string | null>(null);
const initialName = ref("");
const initialCredentials = ref<Record<string, string> | null>(null);
const secretFlags = ref<Record<string, boolean> | null>(null);
const isLoadingPreview = ref(false);
const toast = useToast();

async function fetchIntegrations() {
  isLoading.value = true;
  try {
    const res = await $fetch("/api/integrations");
    integrations.value = res.data.integrations ?? [];
  } catch {
    toast.add({ title: "Failed to load integrations", color: "error" });
  } finally {
    isLoading.value = false;
  }
}

function openAdd(def: IntegrationDef) {
  selectedDef.value = def;
  initialName.value = def.name;
  initialCredentials.value = null;
  secretFlags.value = null;
  editingId.value = null;
  showModal.value = true;
}

async function openEdit(integration: Integration) {
  const def = INTEGRATION_CATALOG.find((d) => d.type === integration.type);
  if (!def) return;
  selectedDef.value = def;
  initialName.value = integration.name;
  initialCredentials.value = null;
  secretFlags.value = null;
  editingId.value = integration.id;
  showModal.value = true;

  isLoadingPreview.value = true;
  try {
    const res = await $fetch(`/api/integrations/${integration.id}/preview`);
    const data = (res as any)?.data ?? null;
    const creds = data?.credentials ?? null;
    const flags = data?.secretFlags ?? null;
    if (creds && typeof creds === "object") {
      const map: Record<string, string> = {};
      for (const [k, v] of Object.entries(creds)) {
        if (v === null || v === undefined) continue;
        map[k] = String(v);
      }
      initialCredentials.value = map;
    }
    if (flags && typeof flags === "object") {
      secretFlags.value = flags;
    }
  } catch {
    toast.add({ title: "Failed to load integration details", color: "error" });
  } finally {
    isLoadingPreview.value = false;
  }
}

function coerceNumber(input: string | undefined): number | undefined {
  const v = (input ?? "").trim();
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function buildCredentials(raw: Record<string, string>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw)) {
    const trimmed = v.trim();
    if (!trimmed) continue;
    if (k === "port" || k === "apiPort" || k === "rotationInterval") {
      const n = coerceNumber(trimmed);
      if (n !== undefined) out[k] = n;
      continue;
    }
    out[k] = trimmed;
  }
  return out;
}

async function handleSave(payload: {
  name: string;
  credentials: Record<string, string>;
}) {
  if (!selectedDef.value) return;
  isSaving.value = true;
  try {
    const credentials = buildCredentials(payload.credentials);
    if (editingId.value) {
      const res = await $fetch(`/api/integrations/${editingId.value}`, {
        method: "PATCH",
        body: {
          name: payload.name || selectedDef.value.name,
          credentials,
        },
      });
      if (!res.success) {
        throw new Error(res.message || "Update failed");
      }
      toast.add({
        title: "Integration successfully updated!",
        color: "success",
        icon: "i-heroicons-check-circle",
      });
    } else {
      // CREATE new
      const res = await $fetch("/api/integrations", {
        method: "POST",
        body: {
          type: selectedDef.value.type,
          name: payload.name || selectedDef.value.name,
          credentials,
        },
      });
      if (!res.success) {
        throw new Error(res.message || "Create failed");
      }
      toast.add({
        title: "Integration successfully created!",
        color: "success",
        icon: "i-heroicons-check-circle",
      });
    }
    showModal.value = false;
    await fetchIntegrations();
  } catch (err) {
    toast.add({
      title: editingId.value ? "Failed to update" : "Failed to create",
      description: err instanceof Error ? err.message : "Try again",
      color: "error",
    });
  } finally {
    isSaving.value = false;
  }
}

async function testIntegration(id: string) {
  isTesting.value[id] = true;
  try {
    const res = await $fetch(`/api/integrations/${id}/test`, {
      method: "POST",
    });
    if (!res.success) {
      throw new Error(res.message || "Test failed");
    }
    toast.add({
      title: "Connection successful!",
      description: res.message,
      color: "success",
    });
    await fetchIntegrations();
  } catch (err) {
    toast.add({
      title: "Test failed",
      description: err instanceof Error ? err.message : "Try again",
      color: "error",
    });
  } finally {
    isTesting.value[id] = false;
  }
}

async function deleteIntegration(id: string) {
  isDeleting.value[id] = true;
  try {
    const res = await $fetch(`/api/integrations/${id}`, { method: "DELETE" });
    if (!res.success) {
      throw new Error(res.message || "Delete failed");
    }
    toast.add({ title: "Integration successfully deleted!", color: "success" });
    integrations.value = integrations.value.filter((i) => i.id !== id);
    await fetchIntegrations();
  } catch (err) {
    toast.add({
      title: "Delete failed",
      description: err instanceof Error ? err.message : "Try again",
      color: "error",
    });
  } finally {
    isDeleting.value[id] = false;
  }
}
async function toggleActive(integration: Integration) {
  try {
    const res = await $fetch(`/api/integrations/${integration.id}`, {
      method: "PATCH",
      body: { isActive: !integration.isActive },
    });
    if (!res.success) {
      throw new Error(res.message || "Update failed");
    }
    integration.isActive = !integration.isActive;
    toast.add({
      title: integration.isActive
        ? "Integration enabled"
        : "Integration disabled",
      color: "success",
    });
    await fetchIntegrations();
  } catch (err) {
    toast.add({
      title: "Failed to update status",
      description: err instanceof Error ? err.message : "Try again",
      color: "error",
    });
  }
}

const connectedTypes = computed(
  () => new Set(integrations.value.map((i) => i.type)),
);
const isConnected = (type: string) => connectedTypes.value.has(type);
const getIntegration = (type: string) =>
  integrations.value.find((i) => i.type === type);

function getDef(type: string) {
  return INTEGRATION_CATALOG.find((d) => d.type === type);
}
function catalogByCategory(cat: string) {
  return INTEGRATION_CATALOG.filter((d) => d.category === cat);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Belum pernah";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const modalTitle = computed(() =>
  editingId.value
    ? `Edit ${selectedDef.value?.name ?? ""}`
    : `Connect ${selectedDef.value?.name ?? ""}`,
);

onMounted(fetchIntegrations);
</script>

<template>
  <AppDashboardLayout id="integrations" title="Integrations">
    <template #content>
      <div class="min-h-screen p-6">
        <div class="mx-auto max-w-7xl space-y-8">
          <!-- Header -->
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-2xl font-bold tracking-tight">Integrations</h1>
              <p class="text-sm text-muted mt-0.5">
                Connect TrafficX with proxy services, browser antidetection, and
                CAPTCHA solvers.
              </p>
            </div>
            <UBadge color="primary" variant="soft">
              {{ integrations.length }} Connected
            </UBadge>
          </div>
          <div v-if="isLoading" class="flex justify-center py-20">
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-8 h-8 animate-spin text-muted"
            />
          </div>
          <template v-else>
            <section v-for="cat in categories" :key="cat.id" class="space-y-4">
              <!-- Category header -->
              <div class="flex items-center gap-2 pb-1 border-b border-muted">
                <UIcon :name="cat.icon" class="w-5 h-5 text-primary" />
                <h2 class="text-base font-semibold">{{ cat.label }}</h2>
                <UBadge color="neutral" variant="soft" size="xs">
                  {{
                    catalogByCategory(cat.id).filter((d) => isConnected(d.type))
                      .length
                  }}
                  / {{ catalogByCategory(cat.id).length }}
                </UBadge>
              </div>

              <!-- Provider cards grid -->
              <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div
                  v-for="def in catalogByCategory(cat.id)"
                  :key="def.type"
                  class="relative border rounded-xl p-5 transition-all"
                  :class="[
                    isConnected(def.type)
                      ? 'border-primary/30 bg-primary/5 shadow-sm'
                      : 'border-secondary/20 bg-secondary/5 hover:border-secondary/40',
                  ]"
                >
                  <div
                    v-if="def.status === 'inactive'"
                    class="absolute inset-0 bg-black/50 flex items-center justify-center"
                  >
                    <span class="text-warning font-semibold text-lg">
                      Disabled
                    </span>
                  </div>
                  <!-- Connected indicator -->
                  <div
                    v-if="isConnected(def.type) && def.status === 'active'"
                    class="absolute top-3 right-3 flex items-center gap-1.5"
                  >
                    <span
                      class="w-2 h-2 rounded-full bg-green-400 animate-pulse"
                    />
                    <span class="text-xs text-green-400 font-medium">
                      Connected
                    </span>
                  </div>

                  <!-- Provider info -->
                  <div class="flex items-start gap-3 mb-3">
                    <div
                      class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      :class="`bg-${def.color}-500/15`"
                    >
                      <UIcon
                        :name="def.icon"
                        class="w-5 h-5"
                        :class="`text-${def.color}-400`"
                      />
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-semibold text-sm">{{
                          def.name
                        }}</span>
                        <UBadge
                          v-if="def.badge"
                          :color="def.badgeColor as any"
                          variant="subtle"
                          size="xs"
                        >
                          {{ def.badge }}
                        </UBadge>
                      </div>
                      <p class="text-xs text-muted mt-0.5 line-clamp-2">
                        {{ def.description }}
                      </p>
                    </div>
                  </div>

                  <!-- Connected integration detail -->
                  <template v-if="isConnected(def.type)">
                    <div class="mb-3 space-y-1 text-xs text-muted">
                      <div class="flex items-center gap-1.5">
                        <UIcon name="i-heroicons-tag" class="w-3.5 h-3.5" />
                        <span>{{ getIntegration(def.type)?.name }}</span>
                      </div>
                      <div class="flex items-center gap-1.5">
                        <UIcon
                          :name="
                            getIntegration(def.type)?.isHealthy
                              ? 'i-heroicons-check-circle'
                              : 'i-heroicons-exclamation-circle'
                          "
                          class="w-3.5 h-3.5"
                          :class="
                            getIntegration(def.type)?.isHealthy
                              ? 'text-green-400'
                              : 'text-amber-400'
                          "
                        />
                        <span>
                          Health:
                          {{
                            getIntegration(def.type)?.isHealthy === null
                              ? "Belum dites"
                              : getIntegration(def.type)?.isHealthy
                                ? "Sehat"
                                : "Bermasalah"
                          }}
                        </span>
                      </div>
                      <div class="flex items-center gap-1.5">
                        <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5" />
                        <span>
                          Last tested:
                          {{
                            formatDate(
                              getIntegration(def.type)?.lastTestedAt ?? null,
                            )
                          }}
                        </span>
                      </div>
                    </div>

                    <!-- Actions for connected -->
                    <div class="flex items-center gap-2 flex-wrap">
                      <UButton
                        size="xs"
                        variant="soft"
                        color="primary"
                        icon="i-heroicons-bolt"
                        :disabled="def.status === 'inactive'"
                        :loading="isTesting[getIntegration(def.type)!.id]"
                        :class="
                          def.status === 'inactive' ? 'cursor-not-allowed' : ''
                        "
                        @click="testIntegration(getIntegration(def.type)!.id)"
                      >
                        Test
                      </UButton>
                      <UButton
                        size="xs"
                        variant="soft"
                        color="neutral"
                        icon="i-heroicons-pencil-square"
                        :disabled="def.status === 'inactive'"
                        :class="
                          def.status === 'inactive' ? 'cursor-not-allowed' : ''
                        "
                        @click="openEdit(getIntegration(def.type)!)"
                      >
                        Edit
                      </UButton>
                      <UButton
                        size="xs"
                        variant="soft"
                        :color="
                          getIntegration(def.type)?.isActive
                            ? 'warning'
                            : 'success'
                        "
                        :icon="
                          getIntegration(def.type)?.isActive
                            ? 'i-heroicons-pause'
                            : 'i-heroicons-play'
                        "
                        :disabled="def.status === 'inactive'"
                        :class="
                          def.status === 'inactive' ? 'cursor-not-allowed' : ''
                        "
                        @click="toggleActive(getIntegration(def.type)!)"
                        >{{
                          getIntegration(def.type)?.isActive
                            ? "Disable"
                            : "Enable"
                        }}
                      </UButton>
                      <UButton
                        size="xs"
                        variant="soft"
                        color="error"
                        icon="i-heroicons-trash"
                        :disabled="def.status === 'inactive'"
                        :loading="isDeleting[getIntegration(def.type)!.id]"
                        :class="
                          def.status === 'inactive' ? 'cursor-not-allowed' : ''
                        "
                        @click="deleteIntegration(getIntegration(def.type)!.id)"
                      >
                        Delete
                      </UButton>
                    </div>
                  </template>

                  <!-- Not connected -->
                  <template v-else>
                    <div class="flex items-center gap-2 mt-3">
                      <UButton
                        size="xs"
                        variant="soft"
                        :disabled="def.status === 'inactive'"
                        :class="
                          def.status === 'inactive' ? 'cursor-not-allowed' : ''
                        "
                        color="primary"
                        icon="i-heroicons-plus"
                        @click="openAdd(def)"
                      >
                        Connect
                      </UButton>
                      <UButton
                        v-if="def.docsUrl"
                        size="xs"
                        variant="ghost"
                        color="neutral"
                        icon="i-heroicons-arrow-top-right-on-square"
                        :to="def.docsUrl"
                        :disabled="def.status === 'inactive'"
                        :class="
                          def.status === 'inactive' ? 'cursor-not-allowed' : ''
                        "
                        target="_blank"
                      >
                        Docs
                      </UButton>
                    </div>
                  </template>
                </div>
              </div>
            </section>
          </template>
        </div>
      </div>

      <AppCampaignAddOrEdit
        v-model:open="showModal"
        :title="modalTitle"
        :def="selectedDef"
        :mode="editingId ? 'edit' : 'create'"
        :loading="isSaving || isLoadingPreview"
        :initial-name="initialName"
        :initial-credentials="initialCredentials ?? undefined"
        :secret-flags="secretFlags ?? undefined"
        @submit="handleSave"
        @invalid="
          toast.add({
            title: 'Invalid form',
            description: $event.message,
            color: 'error',
          })
        "
      />
    </template>
  </AppDashboardLayout>
</template>

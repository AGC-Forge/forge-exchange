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

interface IntegrationDef {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: "proxy" | "antidetect" | "captcha";
  color: string;
  fields: {
    key: string;
    label: string;
    type: string;
    placeholder: string;
    required: boolean;
  }[];
}
// ── Integration catalog ───────────────────────────────────────
const INTEGRATION_CATALOG: IntegrationDef[] = [
  // Proxy
  {
    type: "residential_proxy",
    name: "Residential Proxy",
    description: "Koneksikan provider residential proxy pihak ketiga",
    icon: "i-heroicons-globe-americas",
    category: "proxy",
    color: "emerald",
    fields: [
      {
        key: "apiUrl",
        label: "API URL",
        type: "text",
        placeholder: "https://proxy-api.example.com",
        required: true,
      },
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "Your API key",
        required: true,
      },
      {
        key: "username",
        label: "Username",
        type: "text",
        placeholder: "Username (jika ada)",
        required: false,
      },
      {
        key: "password",
        label: "Password",
        type: "password",
        placeholder: "Password (jika ada)",
        required: false,
      },
    ],
  },
  {
    type: "mobile_proxy",
    name: "Mobile Proxy",
    description: "Koneksikan provider mobile proxy 4G/5G",
    icon: "i-heroicons-device-phone-mobile",
    category: "proxy",
    color: "blue",
    fields: [
      {
        key: "apiUrl",
        label: "API URL",
        type: "text",
        placeholder: "https://mobile-proxy.example.com",
        required: true,
      },
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "Your API key",
        required: true,
      },
      {
        key: "rotateUrl",
        label: "Rotate URL",
        type: "text",
        placeholder: "URL untuk rotate IP",
        required: false,
      },
    ],
  },
  // Antidetect
  {
    type: "multilogin",
    name: "Multilogin",
    description: "Integrasi dengan Multilogin antidetect browser",
    icon: "i-heroicons-shield-check",
    category: "antidetect",
    color: "purple",
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
        placeholder: "Workspace ID kamu",
        required: true,
      },
    ],
  },
  {
    type: "gologin",
    name: "GoLogin",
    description: "Integrasi dengan GoLogin antidetect browser",
    icon: "i-heroicons-finger-print",
    category: "antidetect",
    color: "indigo",
    fields: [
      {
        key: "apiKey",
        label: "API Token",
        type: "password",
        placeholder: "GoLogin API token",
        required: true,
      },
    ],
  },
  {
    type: "adspower",
    name: "AdsPower",
    description: "Integrasi dengan AdsPower browser management",
    icon: "i-heroicons-computer-desktop",
    category: "antidetect",
    color: "amber",
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "AdsPower API key",
        required: true,
      },
      {
        key: "apiUrl",
        label: "Local API URL",
        type: "text",
        placeholder: "http://local.adspower.net:50325",
        required: true,
      },
    ],
  },
  // Captcha
  {
    type: "capmonster",
    name: "CapMonster",
    description: "Solve CAPTCHA otomatis dengan CapMonster Cloud",
    icon: "i-heroicons-puzzle-piece",
    category: "captcha",
    color: "red",
    fields: [
      {
        key: "apiKey",
        label: "Client Key",
        type: "password",
        placeholder: "CapMonster client key",
        required: true,
      },
    ],
  },
  {
    type: "twocaptcha",
    name: "2Captcha",
    description: "Solve CAPTCHA otomatis dengan 2Captcha",
    icon: "i-heroicons-key",
    category: "captcha",
    color: "orange",
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "2Captcha API key",
        required: true,
      },
    ],
  },
];

// ── State ─────────────────────────────────────────────────────
const integrations = ref<Integration[]>([]);
const isLoading = ref(false);
const isSaving = ref(false);
const isTesting = ref<Record<string, boolean>>({});
const showAddModal = ref(false);
const selectedDef = ref<IntegrationDef | null>(null);
const addForm = reactive<Record<string, string>>({});
const addFormName = ref("");
const toast = useToast();

// ── Fetch ─────────────────────────────────────────────────────
async function fetchIntegrations() {
  isLoading.value = true;
  try {
    const res = await $fetch("/api/integrations");
    integrations.value = res.data.integrations ?? [];
  } catch {
    toast.add({ title: "Gagal memuat integrations", color: "error" });
  } finally {
    isLoading.value = false;
  }
}

// ── Add integration ───────────────────────────────────────────
function openAdd(def: IntegrationDef) {
  selectedDef.value = def;
  addFormName.value = def.name;
  def.fields.forEach((f) => (addForm[f.key] = ""));
  showAddModal.value = true;
}

async function handleSave() {
  if (!selectedDef.value) return;
  isSaving.value = true;
  try {
    await $fetch("/api/integrations", {
      method: "POST",
      body: {
        type: selectedDef.value.type,
        name: addFormName.value || selectedDef.value.name,
        credentials: { ...addForm },
      },
    });
    toast.add({
      title: "Integration berhasil ditambahkan!",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
    showAddModal.value = false;
    await fetchIntegrations();
  } catch (err: any) {
    toast.add({
      title: "Gagal menyimpan",
      description: err?.data?.error?.message ?? "Coba lagi",
      color: "error",
    });
  } finally {
    isSaving.value = false;
  }
}

// ── Test integration ──────────────────────────────────────────
async function testIntegration(id: string) {
  isTesting.value[id] = true;
  try {
    const res = await $fetch<any>(`/api/integrations/${id}/test`, {
      method: "POST",
    });
    toast.add({
      title: res.data?.success ? "Koneksi berhasil!" : "Koneksi gagal",
      description: res.message,
      color: res.data?.success ? "success" : "error",
    });
    await fetchIntegrations();
  } catch (err: any) {
    toast.add({
      title: "Test gagal",
      description: err?.data?.error?.message,
      color: "error",
    });
  } finally {
    isTesting.value[id] = false;
  }
}

// ── Delete integration ────────────────────────────────────────
async function deleteIntegration(id: string) {
  try {
    await $fetch(`/api/integrations/${id}`, { method: "DELETE" });
    toast.add({ title: "Integration dihapus", color: "success" });
    integrations.value = integrations.value.filter((i) => i.id !== id);
  } catch {
    toast.add({ title: "Gagal hapus", color: "error" });
  }
}

// ── Computed ──────────────────────────────────────────────────
const connectedTypes = computed(
  () => new Set(integrations.value.map((i) => i.type)),
);

function isConnected(type: string) {
  return connectedTypes.value.has(type);
}

function getIntegration(type: string) {
  return integrations.value.find((i) => i.type === type);
}

function getDef(type: string) {
  return INTEGRATION_CATALOG.find((d) => d.type === type);
}

const categories = [
  { id: "proxy", label: "Proxy Providers", icon: "i-heroicons-globe-alt" },
  {
    id: "antidetect",
    label: "Antidetect Browser",
    icon: "i-heroicons-shield-check",
  },
  { id: "captcha", label: "CAPTCHA Solver", icon: "i-heroicons-puzzle-piece" },
] as const;

onMounted(fetchIntegrations);
</script>

<template>
  <AppDashboardLayout id="integrations" title="Integrations">
    <template #content>
      <div class="min-h-screen p-6">
        <div class="mx-auto max-w-7xl space-y-8">
          <!-- Header -->
          <div>
            <h1 class="text-2xl font-bold tracking-tight">Integrations</h1>
            <p class="text-sm text-muted mt-0.5">
              Hubungkan TrafficX dengan layanan proxy, antidetect browser, dan
              CAPTCHA solver.
            </p>
          </div>

          <!-- Connected integrations -->
          <div v-if="integrations.length > 0">
            <h2
              class="text-sm font-semibold text-muted uppercase tracking-wide mb-3 flex items-center gap-2"
            >
              <span
                class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]"
              />
              Connected ({{ integrations.length }})
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <UPageCard
                v-for="intg in integrations"
                :key="intg.id"
                spotlight
                spotlight-color="primary"
                :ui="{
                  container:
                    'border border-primary/20 dark:border-primary/35 rounded-xl',
                }"
              >
                <div class="flex items-start justify-between mb-3">
                  <div class="flex items-center gap-2.5">
                    <div
                      class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"
                    >
                      <UIcon
                        :name="getDef(intg.type)?.icon ?? 'i-heroicons-cog'"
                        class="w-4 h-4 text-primary"
                      />
                    </div>
                    <div>
                      <p class="text-sm font-semibold">{{ intg.name }}</p>
                      <p class="text-xs text-muted capitalize">
                        {{ intg.type.replace(/_/g, " ") }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span
                      class="w-2 h-2 rounded-full"
                      :class="
                        intg.isHealthy === true
                          ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]'
                          : intg.isHealthy === false
                            ? 'bg-red-400'
                            : 'bg-muted'
                      "
                    />
                    <span class="text-xs text-muted">
                      {{
                        intg.isHealthy === true
                          ? "Healthy"
                          : intg.isHealthy === false
                            ? "Error"
                            : "Belum ditest"
                      }}
                    </span>
                  </div>
                </div>

                <p v-if="intg.lastTestedAt" class="text-xs text-muted mb-3">
                  Last test:
                  {{ new Date(intg.lastTestedAt).toLocaleString("id-ID") }}
                </p>

                <div class="flex gap-2">
                  <UButton
                    icon="i-heroicons-signal"
                    color="neutral"
                    variant="outline"
                    size="xs"
                    :loading="isTesting[intg.id]"
                    @click="testIntegration(intg.id)"
                  >
                    Test
                  </UButton>
                  <UButton
                    icon="i-heroicons-trash"
                    color="error"
                    variant="ghost"
                    size="xs"
                    @click="deleteIntegration(intg.id)"
                  />
                </div>
              </UPageCard>
            </div>
          </div>

          <!-- Catalog by category -->
          <div v-for="cat in categories" :key="cat.id" class="space-y-3">
            <h2
              class="text-sm font-semibold text-muted uppercase tracking-wide flex items-center gap-2"
            >
              <UIcon :name="cat.icon" class="w-4 h-4" />
              {{ cat.label }}
            </h2>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <UPageCard
                v-for="def in INTEGRATION_CATALOG.filter(
                  (d) => d.category === cat.id,
                )"
                :key="def.type"
                spotlight
                :spotlight-color="
                  isConnected(def.type) ? 'primary' : 'secondary'
                "
                :ui="{
                  container:
                    'border border-secondary/20 dark:border-secondary/35 rounded-xl transition-all',
                }"
              >
                <div class="flex items-start justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 rounded-xl flex items-center justify-center"
                      :class="`bg-${def.color}-500/10`"
                    >
                      <UIcon
                        :name="def.icon"
                        class="w-5 h-5"
                        :class="`text-${def.color}-400`"
                      />
                    </div>
                    <div>
                      <p class="font-semibold text-sm">{{ def.name }}</p>
                      <p class="text-xs text-muted mt-0.5">
                        {{ def.category }}
                      </p>
                    </div>
                  </div>
                  <UBadge
                    v-if="isConnected(def.type)"
                    color="success"
                    variant="soft"
                    size="xs"
                    icon="i-heroicons-check"
                  >
                    Connected
                  </UBadge>
                </div>

                <p class="text-xs text-muted mb-4">{{ def.description }}</p>

                <UButton
                  v-if="!isConnected(def.type)"
                  icon="i-heroicons-plus"
                  color="primary"
                  variant="soft"
                  size="sm"
                  block
                  @click="openAdd(def)"
                >
                  Connect
                </UButton>
                <UButton
                  v-else
                  icon="i-heroicons-check-circle"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  block
                  disabled
                >
                  Already Connected
                </UButton>
              </UPageCard>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Modal -->
      <UModal v-model:open="showAddModal" :ui="{ width: 'sm:max-w-md' }">
        <template #content>
          <div class="p-6 space-y-5" v-if="selectedDef">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"
              >
                <UIcon :name="selectedDef.icon" class="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 class="font-semibold">Connect {{ selectedDef.name }}</h3>
                <p class="text-xs text-muted">{{ selectedDef.description }}</p>
              </div>
            </div>

            <div class="space-y-3">
              <UFormField label="Nama koneksi" name="name">
                <UInput
                  v-model="addFormName"
                  :placeholder="`Contoh: ${selectedDef.name} Utama`"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                v-for="field in selectedDef.fields"
                :key="field.key"
                :label="field.label"
                :name="field.key"
                :required="field.required"
              >
                <UInput
                  v-model="addForm[field.key]"
                  :type="field.type"
                  :placeholder="field.placeholder"
                  class="w-full"
                  autocomplete="off"
                />
              </UFormField>
            </div>

            <div class="flex gap-2 justify-end pt-1">
              <UButton
                variant="ghost"
                color="neutral"
                @click="showAddModal = false"
                >Batal</UButton
              >
              <UButton
                icon="i-heroicons-plug"
                color="primary"
                :loading="isSaving"
                @click="handleSave"
              >
                Connect
              </UButton>
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </AppDashboardLayout>
</template>

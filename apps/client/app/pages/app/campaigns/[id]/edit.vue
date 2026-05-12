<script setup lang="ts">
import type { Campaign } from "@forge-exchange/db";

definePageMeta({
  layout: "auth",
  middleware: "auth",
  validate: (params) => {
    //@ts-expect-error id is a string
    return /^[a-zA-Z0-9-]+$/.test(params.id);
  },
});
useSeoMeta({
  title: "Edit Campaign",
  description: "Edit your campaign details to reach your audience.",
  robots: "noindex, nofollow",
});
const route = useRoute();
const router = useRouter();
const id = route.params.id as string;

const { user } = useUserSession();
const { fetchCampaign, updateCampaign } = useCampaigns();
const toast = useToast();

const isLoading = ref(true);
const isSubmitting = ref(false);
const campaign = ref<Campaign | null>(null);

const form = reactive<Partial<CreateCampaignInput>>({
  name: "",
  targetUrl: "",
  description: "",
  dailyLimit: 100,
  totalLimit: null,
  maxConcurrent: 5,
  speedMode: "normal",
  deviceType: "desktop",
  geoMode: "single",
  geoTargets: [] as { country: string; weight: number }[],
  behaviorProfileId: null,
  minDuration: 30,
  maxDuration: 180,
  bounceRate: 20,
  scheduleEnabled: false,
  scheduleStart: "",
  scheduleEnd: "",
  scheduleDays: [] as number[],
  timezone: "UTC",
  webhookUrl: "",
  webhookEnabled: false,
  // Custom click fields
  customClickEnabled: false,
  customClickTargets: [] as CustomClickTarget[],
  customClickOrder: "sequential",
  customClickMaxPerSession: 3,
  sessionMode: "standard" as "standard" | "premium",
  provider: "gologin",
  os: "windows",
  osVersion: "11",
  browserType: "chrome",
  browserVersion: "120",
});
const premiumConfig = reactive<PremiumConfigInput>({
  sessionMode: "standard" as "standard" | "premium",
  provider: "",
  os: "windows",
  osVersion: "11",
  browserType: "chrome",
  browserVersion: "120",
});
const currentBalance = computed(
  () => user.value?.subscription?.creditBalance ?? 0,
);
const customClickTargetsModel = computed<CustomClickTarget[]>({
  get: () => form.customClickTargets ?? [],
  set: (value) => {
    form.customClickTargets = value;
  },
});

const customClickEnabledModel = computed<boolean>({
  get: () => form.customClickEnabled ?? false,
  set: (value) => {
    form.customClickEnabled = value;
  },
});

// ── Fetch campaign data ───────────────────────────────────────
onMounted(async () => {
  isLoading.value = true;
  try {
    const data = await fetchCampaign(id);
    if (!data) {
      toast.add({ title: "Campaign not found", color: "error" });
      await router.push("/app/campaigns");
      return;
    }
    campaign.value = data;

    // Populate form dengan data campaign yang ada
    Object.assign(form, {
      name: data.name ?? "",
      targetUrl: data.targetUrl ?? "",
      description: data.description ?? "",
      dailyLimit: data.dailyLimit ?? 100,
      totalLimit: data.totalLimit ?? null,
      maxConcurrent: data.maxConcurrent ?? 5,
      speedMode: data.speedMode ?? "normal",
      deviceType: data.deviceType ?? "desktop",
      geoMode: data.geoMode ?? "single",
      geoTargets:
        data.geoTargets?.map((g: any) => ({
          country: g.country,
          weight: g.weight,
        })) ?? [],
      behaviorProfileId: data.behaviorProfileId ?? null,
      minDuration: data.minDuration ?? 30,
      maxDuration: data.maxDuration ?? 180,
      bounceRate: data.bounceRate ?? 20,
      scheduleEnabled: data.scheduleEnabled ?? false,
      scheduleStart: data.scheduleStart ?? "",
      scheduleEnd: data.scheduleEnd ?? "",
      scheduleDays: data.scheduleDays ?? [],
      timezone: data.timezone ?? "UTC",
      webhookUrl: data.webhookUrl ?? "",
      webhookEnabled: data.webhookEnabled ?? false,
      customClickEnabled: data.behaviorProfile?.customClickEnabled ?? false,
      customClickTargets: (
        (data.behaviorProfile?.customClickTargets as Record<string, any>[]) ??
        []
      ).map((t: Record<string, any>) => ({
        ...t,
        selectorType: t.selectorType ?? "css",
      })),
      customClickOrder: data.behaviorProfile?.customClickOrder ?? "sequential",
      customClickMaxPerSession:
        data.behaviorProfile?.customClickMaxPerSession ?? 3,
      sessionMode: data.sessionMode ?? "standard",
      provider: data.provider ?? "",
      os: data.os ?? "windows",
      osVersion: data.osVersion ?? "11",
      browserType: data.browserType ?? "chrome",
      browserVersion: data.browserVersion ?? "120",
    });
  } catch {
    toast.add({ title: "Failed to fetch campaign details", color: "error" });
  } finally {
    isLoading.value = false;
  }
});

const creditEstimate = computed(() => {
  const base = 1;
  const geo = (form.geoTargets?.length || 0) > 0 ? 1 : 0;
  const stealth = 1;
  return { base, geo, stealth, total: base + geo + stealth };
});

const speedOptions = [
  { label: "🐢 Slow (more humane)", value: "slow" },
  { label: "🚶 Normal (balanced)", value: "normal" },
  { label: "⚡ Fast (fast)", value: "fast" },
];

const deviceOptions = [
  { label: "🖥️ Desktop", value: "desktop" },
  { label: "📱 Mobile", value: "mobile" },
  { label: "📲 Tablet", value: "tablet" },
  { label: "🎲 Random", value: "random" },
];

const geoModeOptions = [
  { label: "Single Country", value: "single" },
  { label: "Multiple Countries", value: "multiple" },
  { label: "Weighted Distribution", value: "weighted" },
  { label: "Dynamic (auto from proxy)", value: "dynamic" },
];

const countryOptions = COUNTRY_LIST.map((c) => ({
  label: `${c.code} — ${c.name}`,
  value: c.code,
}));

const days = [
  { label: "Sen", value: 1 },
  { label: "Sel", value: 2 },
  { label: "Rab", value: 3 },
  { label: "Kam", value: 4 },
  { label: "Jum", value: 5 },
  { label: "Sab", value: 6 },
  { label: "Min", value: 0 },
];

const { data: profilesData } = await useFetch("/api/behavior-profiles");
const profileOptions = computed(() => [
  { label: "Default Profile", value: null },
  ...(profilesData.value?.data ?? []).map((p: any) => ({
    label: p.name,
    value: p.id,
  })),
]);

function addGeoTarget() {
  form.geoTargets?.push({ country: "", weight: 100 });
}
function removeGeoTarget(i: number) {
  form.geoTargets?.splice(i, 1);
}
function toggleDay(value: number) {
  const idx = form.scheduleDays?.indexOf(value) || -1;
  idx === -1
    ? form.scheduleDays?.push(value)
    : form.scheduleDays?.splice(idx, 1);
}

async function handleSubmit() {
  isSubmitting.value = true;
  try {
    // Build custom click targets dengan selector yang sudah di-resolve
    const resolvedTargets = form.customClickTargets?.map((t) => ({
      selector: buildSelector(t),
      clickRate: t.clickRate,
      waitBefore: t.waitBefore,
      waitAfter: t.waitAfter,
      description: t.description,
    }));

    const payload = {
      name: form.name,
      targetUrl: form.targetUrl,
      description: form.description || undefined,
      dailyLimit: form.dailyLimit,
      totalLimit: form.totalLimit || undefined,
      maxConcurrent: form.maxConcurrent,
      speedMode: form.speedMode,
      deviceType: form.deviceType,
      geoMode: form.geoMode,
      geoTargets: form.geoTargets?.filter((g) => g.country),
      behaviorProfileId: form.behaviorProfileId || undefined,
      minDuration: form.minDuration,
      maxDuration: form.maxDuration,
      bounceRate: form.bounceRate,
      scheduleEnabled: form.scheduleEnabled,
      scheduleStart: form.scheduleEnabled ? form.scheduleStart : undefined,
      scheduleEnd: form.scheduleEnabled ? form.scheduleEnd : undefined,
      scheduleDays: form.scheduleDays,
      timezone: form.timezone,
      webhookUrl: form.webhookEnabled ? form.webhookUrl : undefined,
      webhookEnabled: form.webhookEnabled,
      // Custom click
      customClickEnabled: form.customClickEnabled,
      customClickTargets: form.customClickEnabled ? resolvedTargets : [],
      customClickOrder: form.customClickOrder,
      customClickMaxPerSession: form.customClickMaxPerSession,
      sessionMode: premiumConfig.sessionMode,
      provider: premiumConfig.provider,
      os: premiumConfig.os,
      osVersion: premiumConfig.osVersion,
      browserType: premiumConfig.browserType,
      browserVersion: premiumConfig.browserVersion,
    };

    const ok = await updateCampaign(id, payload);
    if (ok) {
      await router.push(`/app/campaigns`);
    }
  } finally {
    isSubmitting.value = false;
  }
}

function buildSelector(target: CustomClickTarget): string {
  switch (target.selectorType) {
    case "id":
      return `#${target.selector.replace(/^#/, "")}`;
    case "text":
      return `text=${target.selector}`;
    case "xpath":
      return `xpath=${target.selector}`;
    case "css":
    case "attribute":
    default:
      return target.selector;
  }
}
const isRunning = computed(() => campaign.value?.status === "running");
</script>

<template>
  <AppDashboardLayout id="edit-campaign" title="Edit Campaign">
    <template #content>
      <div class="min-h-screen p-6">
        <div class="mx-auto max-w-7xl space-y-6">
          <!-- Loading -->
          <div v-if="isLoading" class="flex justify-center py-20">
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-8 h-8 text-primary animate-spin"
            />
          </div>

          <template v-else>
            <!-- Header -->
            <div class="flex items-center gap-3">
              <UButton
                to="/app/campaigns"
                icon="i-heroicons-arrow-left"
                variant="ghost"
                color="neutral"
                size="sm"
              />
              <div class="flex-1 min-w-0">
                <h1 class="text-2xl font-bold tracking-tight truncate">
                  Edit: {{ campaign?.name }}
                </h1>
                <p class="text-sm text-muted">
                  Update your campaign configuration
                </p>
              </div>
              <UBadge
                v-if="campaign?.status"
                :color="
                  campaign.status === 'running'
                    ? 'success'
                    : campaign.status === 'paused'
                      ? 'warning'
                      : 'neutral'
                "
                variant="soft"
              >
                {{ campaign.status }}
              </UBadge>
            </div>

            <!-- Warning: running -->
            <UAlert
              v-if="isRunning"
              color="warning"
              variant="soft"
              icon="i-heroicons-exclamation-triangle"
              title="Campaign is running"
              description="Pause campaign first before editing."
            />

            <!-- Credit estimate -->
            <div
              class="flex items-center gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl"
            >
              <UIcon
                name="i-heroicons-bolt"
                class="w-5 h-5 text-indigo-400 shrink-0"
              />
              <div class="text-sm">
                <span class="text-muted">Estimasi per session: </span>
                <span class="font-bold text-indigo-400"
                  >{{ creditEstimate.total }} credit</span
                >
                <span class="text-muted ml-2">
                  (base: {{ creditEstimate.base }}
                  {{ creditEstimate.geo ? `+ geo: ${creditEstimate.geo}` : "" }}
                  + stealth: {{ creditEstimate.stealth }})
                </span>
              </div>
            </div>

            <fieldset :disabled="isRunning" class="space-y-5">
              <!-- ── Basic Info ──────────────────────────────── -->
              <div
                class="bg-muted border border-muted rounded-xl p-5 space-y-4"
              >
                <h2
                  class="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2"
                >
                  <UIcon
                    name="i-heroicons-information-circle"
                    class="w-4 h-4"
                  />
                  Basic Information
                </h2>

                <UFormField label="Campaign Name" name="name" required>
                  <UInput
                    v-model="form.name"
                    placeholder="Example: Boost Blog Teknologi"
                    size="lg"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Target URL" name="targetUrl" required>
                  <UInput
                    v-model="form.targetUrl"
                    placeholder="Example: https://website-kamu.com/halaman"
                    icon="i-heroicons-link"
                    size="lg"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Description" name="description">
                  <UTextarea
                    v-model="form.description"
                    placeholder="Optional description"
                    :rows="2"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <!-- ── Traffic Config ──────────────────────────── -->
              <div
                class="bg-muted border border-muted rounded-xl p-5 space-y-4"
              >
                <h2
                  class="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2"
                >
                  <UIcon
                    name="i-heroicons-adjustments-horizontal"
                    class="w-4 h-4"
                  />
                  Traffic Configuration
                </h2>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <UFormField
                    label="Daily Limit (sessions/day)"
                    name="dailyLimit"
                  >
                    <UInput
                      v-model.number="form.dailyLimit"
                      type="number"
                      :min="1"
                      :max="100000"
                      size="lg"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField
                    label="Max Concurrent (parallel)"
                    name="maxConcurrent"
                  >
                    <UInput
                      v-model.number="form.maxConcurrent"
                      type="number"
                      :min="1"
                      :max="50"
                      size="lg"
                      class="w-full"
                    />
                  </UFormField>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <UFormField label="Speed Mode" name="speedMode">
                    <USelect
                      v-model="form.speedMode"
                      :items="speedOptions"
                      size="lg"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField label="Device Type" name="deviceType">
                    <USelect
                      v-model="form.deviceType"
                      :items="deviceOptions"
                      size="lg"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField label="Behavior Profile" name="behaviorProfileId">
                    <USelect
                      v-model="form.behaviorProfileId"
                      :items="profileOptions"
                      placeholder="Default"
                      size="lg"
                      class="w-full"
                    />
                  </UFormField>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <UFormField label="Min Duration (sec)" name="minDuration">
                    <UInput
                      v-model.number="form.minDuration"
                      type="number"
                      :min="5"
                      size="lg"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField label="Max Duration (sec)" name="maxDuration">
                    <UInput
                      v-model.number="form.maxDuration"
                      type="number"
                      :min="5"
                      size="lg"
                      class="w-full"
                    />
                  </UFormField>
                </div>

                <UFormField label="Bounce Rate (%)" name="bounceRate">
                  <div class="space-y-2">
                    <USlider
                      v-model="form.bounceRate"
                      :min="0"
                      :max="100"
                      :step="5"
                    />
                    <div class="flex justify-between text-xs text-muted">
                      <span>0% (all engaged)</span>
                      <span class="font-medium"
                        >{{ form.bounceRate }}% bounce</span
                      >
                      <span>100% (all bounce)</span>
                    </div>
                  </div>
                </UFormField>
              </div>

              <!-- ── Custom Click Element ────────────────────── -->
              <div class="bg-muted border border-muted rounded-xl p-5">
                <h2
                  class="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2 mb-4"
                >
                  <UIcon
                    name="i-heroicons-cursor-arrow-ripple"
                    class="w-4 h-4"
                  />
                  Custom Element Click
                </h2>
                <AppCampaignCustomClickBuilder
                  v-model="customClickTargetsModel"
                  v-model:enabled="customClickEnabledModel"
                  :click-order="form.customClickOrder"
                  :max-per-session="form.customClickMaxPerSession"
                  @update:click-order="
                    (val) =>
                      (form.customClickOrder = val as 'random' | 'sequential')
                  "
                  @update:max-per-session="
                    (val) =>
                      (form.customClickMaxPerSession = val as
                        | number
                        | undefined)
                  "
                />
              </div>

              <!-- ── GEO Targeting ───────────────────────────── -->
              <div
                class="bg-muted border border-muted rounded-xl p-5 space-y-4"
              >
                <h2
                  class="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2"
                >
                  <UIcon name="i-heroicons-globe-alt" class="w-4 h-4" />
                  GEO Targeting
                </h2>
                <UFormField label="Mode" name="geoMode">
                  <USelect
                    v-model="form.geoMode"
                    :items="geoModeOptions"
                    size="lg"
                    class="w-full sm:w-64"
                  />
                </UFormField>
                <div v-if="form.geoMode !== 'dynamic'" class="space-y-2">
                  <div
                    v-for="(target, i) in form.geoTargets"
                    :key="i"
                    class="flex items-center gap-2"
                  >
                    <USelect
                      v-model="target.country"
                      :items="countryOptions"
                      placeholder="Pilih negara"
                      class="flex-1"
                    />
                    <UInput
                      v-if="form.geoMode === 'weighted'"
                      v-model.number="target.weight"
                      type="number"
                      :min="1"
                      :max="100"
                      placeholder="Weight %"
                      class="w-24"
                    />
                    <UButton
                      icon="i-heroicons-x-mark"
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      @click="removeGeoTarget(i as number)"
                    />
                  </div>
                  <UButton
                    v-if="form.geoTargets && form.geoTargets?.length < 20"
                    icon="i-heroicons-plus"
                    variant="soft"
                    color="neutral"
                    size="sm"
                    @click="addGeoTarget"
                  >
                    Tambah Negara
                  </UButton>
                </div>
                <p v-else class="text-sm text-muted">
                  Dynamic mode — automatically detect country from the proxy.
                </p>
              </div>

              <!-- ── Scheduler ───────────────────────────────── -->
              <div
                class="bg-muted border border-muted rounded-xl p-5 space-y-4"
              >
                <div class="flex items-center justify-between">
                  <h2
                    class="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2"
                  >
                    <UIcon name="i-heroicons-clock" class="w-4 h-4" />
                    Scheduler
                  </h2>
                  <USwitch v-model="form.scheduleEnabled" />
                </div>
                <div v-if="form.scheduleEnabled" class="space-y-4">
                  <div class="grid grid-cols-2 gap-4">
                    <UFormField label="Start" name="scheduleStart">
                      <UInput
                        v-model="form.scheduleStart"
                        type="time"
                        size="lg"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="End" name="scheduleEnd">
                      <UInput
                        v-model="form.scheduleEnd"
                        type="time"
                        size="lg"
                        class="w-full"
                      />
                    </UFormField>
                  </div>
                  <UFormField label="Active Days">
                    <div class="flex gap-2 flex-wrap">
                      <button
                        v-for="day in days"
                        :key="day.value"
                        type="button"
                        class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        :class="
                          form.scheduleDays?.includes(day.value)
                            ? 'bg-primary text-white'
                            : 'bg-secondary/20 text-muted hover:bg-secondary/30'
                        "
                        @click="toggleDay(day.value)"
                      >
                        {{ day.label }}
                      </button>
                    </div>
                  </UFormField>
                </div>
              </div>

              <!-- ── Webhook ─────────────────────────────────── -->
              <div
                class="bg-muted border border-muted rounded-xl p-5 space-y-4"
              >
                <div class="flex items-center justify-between">
                  <h2
                    class="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2"
                  >
                    <UIcon name="i-heroicons-bell" class="w-4 h-4" />
                    Webhook Notification
                  </h2>
                  <UToggle v-model="form.webhookEnabled" />
                </div>
                <div v-if="form.webhookEnabled">
                  <UFormField label="Webhook URL" name="webhookUrl">
                    <UInput
                      v-model="form.webhookUrl"
                      placeholder="https://your-app.com/webhook"
                      icon="i-heroicons-link"
                      size="lg"
                      class="w-full"
                    />
                  </UFormField>
                </div>
              </div>

              <!-- ── Submit ──────────────────────────────────── -->
              <div class="flex gap-3 justify-end pb-6">
                <UButton
                  to="/app/campaigns"
                  variant="ghost"
                  color="neutral"
                  size="lg"
                >
                  Cancel
                </UButton>
                <UButton
                  size="lg"
                  :loading="isSubmitting"
                  :disabled="isRunning"
                  icon="i-heroicons-check"
                  color="primary"
                  class="text-white"
                  @click="handleSubmit"
                >
                  Save Changes
                </UButton>
              </div>
            </fieldset>
          </template>
        </div>
      </div>
    </template>
  </AppDashboardLayout>
</template>

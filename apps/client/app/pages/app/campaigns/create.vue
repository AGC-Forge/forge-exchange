<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";

definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Create Campaigns",
  description:
    "Create a new campaign to start driving traffic to your website.",
  robots: "noindex, nofollow",
});

const { user } = useUserSession();
const { createCampaign } = useCampaigns();
const router = useRouter();
const toast = useToast();
const isSubmitting = ref(false);

const form = reactive<Partial<CreateCampaignInput>>({
  name: "",
  targetUrl: "",
  description: "",
  dailyLimit: 100,
  totalLimit: null as number | null,
  maxConcurrent: 5,
  speedMode: "normal" as "slow" | "normal" | "fast",
  deviceType: "desktop" as "desktop" | "mobile" | "tablet" | "random",
  geoMode: "single" as "single" | "multiple" | "weighted" | "dynamic",
  geoTargets: [] as GeoTargetInput[],
  behaviorProfileId: null as string | null,
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
  customClickEnabled: false,
  customClickTargets: [
    {
      selector: "",
      selectorType: "css",
      clickRate: 0,
      waitBefore: 0,
      waitAfter: 0,
      description: "",
    },
  ],
  customClickOrder: "sequential" as "sequential" | "random",
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

const creditEstimate = computed(() => {
  const base = 1;
  const geo = (form.geoTargets?.length || 0) > 0 ? 1 : 0;
  const stealth = 1;
  const persistence = 0;
  return {
    base,
    geo,
    stealth,
    persistence,
    total: base + geo + stealth + persistence,
  };
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
  ...(profilesData.value?.data ?? []).map((p) => ({
    label: p.name,
    value: p.id,
  })),
]);

function addGeoTarget() {
  form.geoTargets?.push({
    country: "",
    weight: 100,
    proxySource: "none",
    proxyPoolId: null,
    integrationId: null,
  });
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

async function handleSubmit(event: FormSubmitEvent<CreateCampaignInput>) {
  isSubmitting.value = true;
  try {
    const resolvedTargets = form.customClickTargets?.map((t) => ({
      selector: buildSelector(t),
      clickRate: t.clickRate,
      waitBefore: t.waitBefore,
      waitAfter: t.waitAfter,
      description: t.description,
    }));

    const payload = {
      ...form,
      description: form.description || undefined,
      behaviorProfileId: form.behaviorProfileId || undefined,
      webhookUrl: form.webhookEnabled ? form.webhookUrl : undefined,
      scheduleStart: form.scheduleEnabled ? form.scheduleStart : undefined,
      scheduleEnd: form.scheduleEnabled ? form.scheduleEnd : undefined,
      geoTargets: form.geoTargets?.filter((g) => g.country),
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

    const campaign = await createCampaign(payload);
    if (campaign) {
      await router.push(`/app/campaigns`);
      // await router.push(`/app/campaigns/${campaign.id}`);
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
</script>

<template>
  <AppDashboardLayout id="create-campaign" title="Create Campaign">
    <template #content>
      <div class="min-h-screen p-6">
        <div class="mx-auto max-w-7xl space-y-6">
          <div class="flex items-center gap-3">
            <UButton
              to="/app/campaigns"
              icon="i-heroicons-arrow-left"
              variant="ghost"
              color="neutral"
              size="sm"
            />
            <div>
              <h1 class="text-2xl font-bold tracking-tight">Create Campaign</h1>
              <p class="text-sm text-muted">
                Configure your new traffic campaign.
              </p>
            </div>
          </div>
          <div
            v-if="creditEstimate"
            class="flex items-center gap-3 p-4 bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 dark:border-indigo-500/20 rounded-xl"
          >
            <UIcon
              name="i-heroicons-bolt"
              class="w-5 h-5 text-indigo-400 dark:text-indigo-500 shrink-0"
            />
            <div class="text-sm">
              <span class="text-muted">Estimasi per session: </span>
              <span class="font-bold text-indigo-400 dark:text-indigo-500"
                >{{ creditEstimate.total }} credit</span
              >
              <span class="text-muted ml-2">
                (base: {{ creditEstimate.base }}
                {{ creditEstimate.geo ? `+ geo: ${creditEstimate.geo}` : "" }}
                {{
                  creditEstimate.stealth
                    ? `+ stealth: ${creditEstimate.stealth}`
                    : ""
                }})
              </span>
            </div>
          </div>

          <UForm
            :schema="createCampaignSchema"
            :state="form"
            @submit="handleSubmit"
            class="space-y-5"
          >
            <div class="bg-muted border border-muted rounded-xl p-5">
              <h2
                class="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2 mb-4"
              >
                <UIcon name="i-heroicons-rocket-launch" class="w-4 h-4" />
                Session Mode
              </h2>
              <AppCampaignPremiumModeSection
                v-model="premiumConfig"
                :has-geo-targets="
                  (form.geoTargets?.filter((g) => g.country).length ?? 0) > 0
                "
                :daily-limit="form.dailyLimit ?? 0"
                :current-balance="Number(currentBalance ?? 0)"
              />
            </div>
            <!-- ── Section: Basic Info ─────────────────────────── -->
            <div class="bg-muted border border-muted rounded-xl p-5 space-y-4">
              <h2
                class="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2"
              >
                <UIcon name="i-heroicons-information-circle" class="w-4 h-4" />
                Basic Information
              </h2>

              <UFormField label="Nama Campaign" name="name" required>
                <UInput
                  v-model="form.name"
                  placeholder="Contoh: Boost Blog Teknologi"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Target URL" name="targetUrl" required>
                <UInput
                  v-model="form.targetUrl"
                  placeholder="https://website-kamu.com/halaman"
                  icon="i-heroicons-link"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Deskripsi" name="description">
                <UTextarea
                  v-model="form.description"
                  placeholder="Deskripsi singkat campaign ini (opsional)"
                  :rows="2"
                  class="w-full"
                />
              </UFormField>
            </div>

            <!-- ── Section: Traffic Config ────────────────────── -->
            <div class="bg-muted border border-muted rounded-xl p-5 space-y-4">
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
                  label="Daily Limit (sessions/hari)"
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

              <!-- Duration -->
              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Min Duration (detik)" name="minDuration">
                  <UInput
                    v-model.number="form.minDuration"
                    type="number"
                    :min="5"
                    size="lg"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Max Duration (detik)" name="maxDuration">
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
                    <span class="text-muted font-medium"
                      >{{ form.bounceRate }}% bounce</span
                    >
                    <span>100% (all bounce)</span>
                  </div>
                </div>
              </UFormField>
            </div>

            <!-- ── Section: Custom Element Click ─────────────────────── -->
            <div class="bg-muted border border-muted rounded-xl p-5">
              <h2
                class="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2 mb-4"
              >
                <UIcon name="i-heroicons-cursor-arrow-ripple" class="w-4 h-4" />
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
                    (form.customClickMaxPerSession = val as number | undefined)
                "
              />
            </div>

            <!-- ── Section: GEO Targeting ─────────────────────── -->
            <div class="bg-muted border border-muted rounded-xl p-5 space-y-4">
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
                  class="w-full"
                />
              </UFormField>

              <!-- GEO target rows -->
              <AppCampaignGeoTargetSection
                v-model="form.geoTargets as GeoTargetInput[]"
                :geoMode="
                  form.geoMode as 'single' | 'multiple' | 'weighted' | 'dynamic'
                "
                @update:modelValue="(val) => (form.geoTargets = val)"
              />
            </div>

            <!-- ── Section: Scheduler ─────────────────────────── -->
            <div class="bg-muted border border-muted rounded-xl p-5 space-y-4">
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
                  <UFormField label="Mulai" name="scheduleStart">
                    <UInput
                      v-model="form.scheduleStart"
                      type="time"
                      size="lg"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField label="Selesai" name="scheduleEnd">
                    <UInput
                      v-model="form.scheduleEnd"
                      type="time"
                      size="lg"
                      class="w-full"
                    />
                  </UFormField>
                </div>

                <UFormField label="Hari Aktif" name="scheduleDays">
                  <div class="flex gap-2 flex-wrap">
                    <button
                      v-for="day in days"
                      :key="day.value"
                      type="button"
                      class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer active:scale-95"
                      :class="
                        form.scheduleDays?.includes(day.value)
                          ? 'bg-primary-600 dark:bg-primary-500 text-white'
                          : 'border border-muted rounded-sm text-muted hover:bg-neutral-200 dark:hover:bg-neutral-900'
                      "
                      @click="toggleDay(day.value)"
                    >
                      {{ day.label }}
                    </button>
                  </div>
                </UFormField>
              </div>
            </div>

            <!-- ── Section: Webhook ───────────────────────────── -->
            <div class="bg-muted border border-muted rounded-xl p-5 space-y-4">
              <div class="flex items-center justify-between">
                <h2
                  class="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2"
                >
                  <UIcon name="i-heroicons-bell" class="w-4 h-4" />
                  Webhook Notifikasi
                </h2>
                <USwitch v-model="form.webhookEnabled" />
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
                <p class="text-xs text-muted mt-1.5">
                  A POST request will be sent when a campaign completes, fails,
                  or reaches its limit.
                </p>
              </div>
            </div>

            <!-- ── Submit ─────────────────────────────────────── -->
            <div class="flex gap-3 justify-end pb-6">
              <UButton
                to="/app/campaigns"
                variant="ghost"
                color="neutral"
                size="lg"
                :disabled="isSubmitting"
              >
                Cancel
              </UButton>
              <UButton
                type="submit"
                size="lg"
                color="primary"
                :loading="isSubmitting"
                :disabled="isSubmitting"
                icon="i-heroicons-rocket-launch"
                class="text-white"
              >
                Create Campaign
              </UButton>
            </div>
          </UForm>
        </div>
      </div>
    </template>
  </AppDashboardLayout>
</template>

<style scoped></style>

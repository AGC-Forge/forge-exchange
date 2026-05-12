<script setup lang="ts">
export interface OsBrowserValue {
  os: string;
  osVersion: string;
  browserType: string;
  browserVersion: string;
}

const props = defineProps<{
  modelValue: OsBrowserValue;
}>();

const emit = defineEmits<{
  "update:modelValue": [OsBrowserValue];
}>();

// ── OS definitions ────────────────────────────────────────────
const OS_LIST = [
  {
    value: "windows",
    label: "Windows",
    icon: "i-simple-icons-windows",
    color: "text-blue-500 dark:text-blue-400",
    versions: [
      { label: "Windows 11", value: "11" },
      { label: "Windows 10", value: "10" },
    ],
  },
  {
    value: "macos",
    label: "macOS",
    icon: "i-simple-icons-apple",
    color: "text-muted",
    versions: [
      { label: "Sonoma 14", value: "14" },
      { label: "Ventura 13", value: "13" },
      { label: "Monterey 12", value: "12" },
    ],
  },
  {
    value: "android",
    label: "Android",
    icon: "i-simple-icons-android",
    color: "text-emerald-500 dark:text-emerald-400",
    versions: [
      { label: "Android 14", value: "14" },
      { label: "Android 13", value: "13" },
      { label: "Android 12", value: "12" },
      { label: "Android 11", value: "11" },
    ],
  },
  {
    value: "ios",
    label: "iOS",
    icon: "i-heroicons-device-phone-mobile",
    color: "text-muted",
    versions: [
      { label: "iOS 17", value: "17" },
      { label: "iOS 16", value: "16" },
      { label: "iOS 15", value: "15" },
    ],
  },
  {
    value: "linux",
    label: "Linux",
    icon: "i-simple-icons-linux",
    color: "text-amber-500 dark:text-amber-400",
    versions: [
      { label: "Ubuntu 22.04", value: "ubuntu22" },
      { label: "Ubuntu 20.04", value: "ubuntu20" },
      { label: "Debian 12", value: "debian12" },
    ],
  },
];

// ── Browser definitions ───────────────────────────────────────
const BROWSER_LIST = [
  {
    value: "chrome",
    label: "Chrome",
    icon: "i-simple-icons-googlechrome",
    color: "text-blue-500 dark:text-blue-400",
    versions: [
      { label: "Chrome 121", value: "121" },
      { label: "Chrome 120", value: "120" },
      { label: "Chrome 119", value: "119" },
    ],
  },
  {
    value: "firefox",
    label: "Firefox",
    icon: "i-simple-icons-firefox",
    color: "text-orange-500 dark:text-orange-400",
    versions: [
      { label: "Firefox 122", value: "122" },
      { label: "Firefox 121", value: "121" },
      { label: "Firefox 120", value: "120" },
    ],
  },
  {
    value: "safari",
    label: "Safari",
    icon: "i-simple-icons-safari",
    color: "text-blue-500 dark:text-blue-400",
    versions: [
      { label: "Safari 17", value: "17" },
      { label: "Safari 16", value: "16" },
    ],
  },
  {
    value: "edge",
    label: "Edge",
    icon: "i-simple-icons-microsoftedge",
    color: "text-blue-500 dark:text-blue-400",
    versions: [
      { label: "Edge 121", value: "121" },
      { label: "Edge 120", value: "120" },
    ],
  },
];

// ── OS ↔ Browser compatibility matrix ────────────────────────
const OS_BROWSER_COMPAT: Record<string, string[]> = {
  windows: ["chrome", "firefox", "edge"],
  macos: ["safari", "chrome", "firefox", "edge"],
  linux: ["chrome", "firefox"],
  android: ["chrome", "firefox"],
  ios: ["safari", "chrome"],
};

// ── Local state mirroring props ───────────────────────────────
const local = reactive({ ...props.modelValue });

watch(
  () => props.modelValue,
  (v) => Object.assign(local, v),
  { deep: true },
);

// ── Computed: available browsers sesuai OS ────────────────────
const availableBrowsers = computed(() =>
  BROWSER_LIST.filter((b) =>
    (OS_BROWSER_COMPAT[local.os] ?? []).includes(b.value),
  ),
);

const selectedOsDef = computed(() => OS_LIST.find((o) => o.value === local.os));
const selectedBrowserDef = computed(() =>
  BROWSER_LIST.find((b) => b.value === local.browserType),
);

const osVersionOptions = computed(() => selectedOsDef.value?.versions ?? []);
const browserVersionOptions = computed(
  () => selectedBrowserDef.value?.versions ?? [],
);

// ── When OS changes → reset browser jika tidak compatible ────
function selectOs(os: string) {
  local.os = os;
  local.osVersion =
    OS_LIST.find((o) => o.value === os)?.versions[0]?.value ?? "";

  const compat = OS_BROWSER_COMPAT[os] ?? [];
  if (!compat.includes(local.browserType)) {
    local.browserType = compat[0] ?? "chrome";
    local.browserVersion =
      BROWSER_LIST.find((b) => b.value === local.browserType)?.versions[0]
        ?.value ?? "";
  }

  emit("update:modelValue", { ...local });
}

function selectBrowser(browser: string) {
  local.browserType = browser;
  local.browserVersion =
    BROWSER_LIST.find((b) => b.value === browser)?.versions[0]?.value ?? "";
  emit("update:modelValue", { ...local });
}

function updateOsVersion(v: string) {
  local.osVersion = v;
  emit("update:modelValue", { ...local });
}

function updateBrowserVersion(v: string) {
  local.browserVersion = v;
  emit("update:modelValue", { ...local });
}
</script>

<template>
  <div class="space-y-5">
    <!-- OS Picker -->
    <div class="space-y-2">
      <label class="text-xs font-semibold text-muted uppercase tracking-wide">
        Operating System
      </label>

      <div class="flex gap-2 flex-wrap">
        <button
          v-for="os in OS_LIST"
          :key="os.value"
          type="button"
          class="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all"
          :class="
            local.os === os.value
              ? 'border-primary/50 bg-primary/10 text-primary'
              : 'border-secondary/20 text-muted hover:border-secondary/40'
          "
          @click="selectOs(os.value)"
        >
          <UIcon
            :name="os.icon"
            class="w-4 h-4"
            :class="local.os === os.value ? 'text-primary' : os.color"
          />
          {{ os.label }}
        </button>
      </div>

      <!-- OS Version -->
      <div v-if="osVersionOptions.length > 0" class="flex gap-2 flex-wrap">
        <button
          v-for="ver in osVersionOptions"
          :key="ver.value"
          type="button"
          class="px-2.5 py-1 rounded-md border text-xs font-mono transition-all"
          :class="
            local.osVersion === ver.value
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-secondary/15 text-muted hover:border-secondary/30'
          "
          @click="updateOsVersion(ver.value)"
        >
          {{ ver.label }}
        </button>
      </div>
    </div>

    <!-- Browser Picker -->
    <div class="space-y-2">
      <label class="text-xs font-semibold text-muted uppercase tracking-wide">
        Browser
        <span class="ml-1 font-normal text-muted/60 normal-case">
          (compatible with {{ selectedOsDef?.label }})
        </span>
      </label>

      <div class="flex gap-2 flex-wrap">
        <button
          v-for="browser in availableBrowsers"
          :key="browser.value"
          type="button"
          class="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all"
          :class="
            local.browserType === browser.value
              ? 'border-primary/50 bg-primary/10 text-primary'
              : 'border-secondary/20 text-muted hover:border-secondary/40'
          "
          @click="selectBrowser(browser.value)"
        >
          <UIcon
            :name="browser.icon"
            class="w-4 h-4"
            :class="
              local.browserType === browser.value
                ? 'text-primary'
                : browser.color
            "
          />
          {{ browser.label }}
        </button>
      </div>

      <!-- Browser Version -->
      <div v-if="browserVersionOptions.length > 0" class="flex gap-2 flex-wrap">
        <button
          v-for="ver in browserVersionOptions"
          :key="ver.value"
          type="button"
          class="px-2.5 py-1 rounded-md border text-xs font-mono transition-all"
          :class="
            local.browserVersion === ver.value
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-secondary/15 text-muted hover:border-secondary/30'
          "
          @click="updateBrowserVersion(ver.value)"
        >
          {{ ver.label }}
        </button>
      </div>
    </div>

    <!-- Consistency preview -->
    <div
      v-if="local.os && local.browserType"
      class="flex items-center gap-3 px-4 py-3 bg-secondary/10 border border-secondary/20 rounded-xl"
    >
      <UIcon
        name="i-heroicons-information-circle"
        class="w-4 h-4 text-primary shrink-0"
      />
      <div class="text-xs text-muted space-y-0.5">
        <p>
          <span class="font-semibold text-default">
            Profile to be created:
          </span>
          <span class="font-mono">
            {{ selectedOsDef?.label }} {{ local.osVersion }} +
            {{ selectedBrowserDef?.label }} {{ local.browserVersion }}
          </span>
        </p>
        <p>
          Client Hints, User Agent, Platform, GPU, and WebRTC will be
          automatically synchronized by antidetect browser.
        </p>
      </div>
    </div>
  </div>
</template>

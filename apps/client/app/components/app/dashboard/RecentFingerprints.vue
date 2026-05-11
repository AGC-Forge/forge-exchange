<script setup lang="ts">
defineProps<{
  fingerprints: Array<{
    id: string;
    userAgent: string;
    platform: string;
    timezone: string;
    screenWidth: number;
    screenHeight: number;
    webgl?: Record<string, any> | null;
    canvas?: Record<string, any> | null;
    createdAt: string;
  }>;
}>();

const toast = useToast();
const showRawModal = ref(false);
const selectedRawJson = ref("");

function shortText(value: string, max = 56): string {
  if (!value) return "—";
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function webglSummary(webgl?: Record<string, any> | null): string {
  if (!webgl) return "N/A";
  const vendor = typeof webgl.vendor === "string" ? webgl.vendor : "";
  const renderer = typeof webgl.renderer === "string" ? webgl.renderer : "";
  const joined = [vendor, renderer].filter(Boolean).join(" / ");
  return joined || "N/A";
}

function canvasSummary(canvas?: Record<string, any> | null): string {
  if (!canvas) return "N/A";
  if (typeof canvas.signature === "string") {
    return `${canvas.signature.slice(0, 12)}...`;
  }
  if (typeof canvas.text === "string") {
    return `${canvas.text.slice(0, 12)}...`;
  }
  return "N/A";
}

async function copyFingerprintId(id: string): Promise<void> {
  try {
    if (process.client && navigator?.clipboard) {
      await navigator.clipboard.writeText(id);
      toast.add({
        title: "Copied",
        description: "Fingerprint ID berhasil disalin",
        color: "success",
      });
      return;
    }
    throw new Error("Clipboard API unavailable");
  } catch {
    toast.add({
      title: "Gagal copy",
      description: "Clipboard tidak tersedia di browser ini",
      color: "error",
    });
  }
}

async function copyRawJson(): Promise<void> {
  try {
    if (process.client && navigator?.clipboard) {
      await navigator.clipboard.writeText(selectedRawJson.value || "");
      toast.add({
        title: "Copied",
        description: "Raw JSON berhasil disalin",
        color: "success",
      });
      return;
    }
    throw new Error("Clipboard API unavailable");
  } catch {
    toast.add({
      title: "Gagal copy",
      description: "Clipboard tidak tersedia di browser ini",
      color: "error",
    });
  }
}

function openRawJson(fp: {
  id: string;
  userAgent: string;
  platform: string;
  timezone: string;
  webgl?: Record<string, any> | null;
  canvas?: Record<string, any> | null;
  createdAt: string;
}): void {
  selectedRawJson.value = JSON.stringify(
    {
      id: fp.id,
      createdAt: fp.createdAt,
      userAgent: fp.userAgent,
      platform: fp.platform,
      timezone: fp.timezone,
      webgl: fp.webgl ?? null,
      canvas: fp.canvas ?? null,
    },
    null,
    2,
  );
  showRawModal.value = true;
}
</script>

<template>
  <UPageCard
    spotlight
    spotlight-color="secondary"
    :ui="{
      root: 'overflow-hidden overflow-x-auto shadow-md w-full',
      container:
        'shadow-md border border-secondary/20 dark:border-secondary/35 rounded-xl transition-all group overflow-hidden',
    }"
  >
    <div
      class="flex items-center justify-between px-5 py-4 border-b border-muted"
    >
      <div>
        <h3 class="text-sm font-semibold">Recent Fingerprints</h3>
        <p class="text-xs text-muted mt-0.5">WebGL & canvas snapshot</p>
      </div>
      <UBadge color="neutral" variant="soft" size="xs">
        {{ fingerprints.length }}
      </UBadge>
    </div>

    <div v-if="fingerprints.length === 0" class="text-center py-8">
      <UIcon
        name="heroicons:finger-print"
        class="w-8 h-8 text-muted mx-auto mb-2"
      />
      <p class="text-sm text-muted">No fingerprint yet</p>
    </div>

    <div v-else class="divide-y divide-muted">
      <div v-for="fp in fingerprints" :key="fp.id" class="px-5 py-3.5">
        <p class="text-xs text-muted mb-1">
          {{ new Date(fp.createdAt).toLocaleString("id-ID") }}
        </p>
        <p class="text-sm text-muted font-medium">
          {{ fp.platform }} · {{ fp.screenWidth }}x{{ fp.screenHeight }} ·
          {{ fp.timezone }}
        </p>
        <p class="text-xs text-muted mt-1">UA: {{ shortText(fp.userAgent) }}</p>
        <p class="text-xs text-muted mt-1">
          WebGL: {{ shortText(webglSummary(fp.webgl), 52) }}
        </p>
        <p class="text-xs text-muted mt-0.5">
          Canvas: {{ canvasSummary(fp.canvas) }}
        </p>
        <div class="flex items-center gap-2 mt-2">
          <UButton
            size="xs"
            variant="soft"
            color="neutral"
            icon="i-heroicons-clipboard-document"
            @click="copyFingerprintId(fp.id)"
          >
            Copy ID
          </UButton>
          <UButton
            size="xs"
            variant="soft"
            color="neutral"
            icon="i-heroicons-code-bracket"
            @click="openRawJson(fp)"
          >
            View Raw JSON
          </UButton>
        </div>
      </div>
    </div>
  </UPageCard>

  <UModal v-model:open="showRawModal" :ui="{ wrapper: 'sm:max-w-3xl' }">
    <template #content>
      <UPageCard
        :ui="{
          root: 'bg-[#0b1220] text-slate-100',
          container: 'border border-white/10 rounded-xl',
        }"
      >
        <div
          class="px-5 py-4 border-b border-white/10 flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            <UButton
              size="xs"
              variant="soft"
              color="neutral"
              icon="i-heroicons-clipboard-document-list"
              @click="copyRawJson"
            >
              Copy Raw JSON
            </UButton>
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-heroicons-x-mark"
              @click="showRawModal = false"
            />
          </div>
        </div>
        <div class="p-5">
          <pre
            class="text-xs leading-5 overflow-auto max-h-[60vh] whitespace-pre-wrap"
            >{{ selectedRawJson }}</pre
          >
        </div>
      </UPageCard>
    </template>
  </UModal>
</template>

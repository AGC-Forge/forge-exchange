<script setup lang="ts">
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ "update:open": [boolean]; imported: [] }>();

const { bulkImport } = useProxies();

const isOpen = computed({
  get: () => props.open,
  set: (v) => emit("update:open", v),
});

const rawText = ref("");
const defaultType = ref("http");
const isImporting = ref(false);
const importResult = ref<any>(null);

const lineCount = computed(
  () =>
    rawText.value
      .split("\n")
      .filter((l) => l.trim() && !l.trim().startsWith("#")).length,
);

const typeOptions = [
  { label: "HTTP", value: "http" },
  { label: "HTTPS", value: "https" },
  { label: "SOCKS5", value: "socks5" },
  { label: "Residential", value: "residential" },
  { label: "Mobile", value: "mobile" },
  { label: "ISP", value: "isp" },
  { label: "Rotating", value: "rotating" },
];

async function handleImport() {
  if (!rawText.value.trim()) return;
  isImporting.value = true;
  importResult.value = null;
  const result = await bulkImport(rawText.value, defaultType.value);
  importResult.value = result;
  if (result?.imported > 0) emit("imported");
  isImporting.value = false;
}

function handleClose() {
  isOpen.value = false;
  rawText.value = "";
  importResult.value = null;
}
</script>

<template>
  <UModal v-model:open="isOpen" :ui="{ wrapper: 'sm:max-w-2xl' }">
    <template #content>
      <div class="p-6 space-y-5">
        <!-- Header -->
        <div>
          <h3 class="font-semibold text-lg">Bulk Import Proxy</h3>
          <p class="text-sm text-muted mt-0.5">
            Import multiple proxies at once. Maximum 500 rows per import.
          </p>
        </div>

        <!-- Format guide -->
        <div class="bg-muted border border-muted rounded-xl p-4 space-y-3">
          <p class="text-xs font-semibold text-warning uppercase tracking-wide">
            Supported formats:
          </p>
          <div class="space-y-2 font-mono text-xs">
            <div class="flex items-start gap-3">
              <span class="text-indigo-500 dark:text-indigo-400 shrink-0 w-6"
                >1.</span
              >
              <div>
                <p>http://user:pass@host:port</p>
                <p class="text-muted">URL format with auth</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-indigo-500 dark:text-indigo-400 shrink-0 w-6"
                >2.</span
              >
              <div>
                <p>socks5://host:port</p>
                <p class="text-muted">URL format without auth</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-indigo-500 dark:text-indigo-400 shrink-0 w-6"
                >3.</span
              >
              <div>
                <p>host:port:user:pass:type:country</p>
                <p class="text-muted">
                  Colon-separated (country optional, e.g. US)
                </p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-indigo-500 dark:text-indigo-400 shrink-0 w-6"
                >4.</span
              >
              <div>
                <p>host:port</p>
                <p class="text-muted">
                  Host and port only (use default type below)
                </p>
              </div>
            </div>
          </div>
          <p class="text-xs text-muted">
            Lines starting with a # are comments and will be ignored.
          </p>
        </div>

        <!-- Default type -->
        <UFormField label="Default Type (if not specified in line)" name="type">
          <USelect v-model="defaultType" :items="typeOptions" class="w-full" />
        </UFormField>

        <!-- Textarea -->
        <UFormField label="Proxy List" name="raw" required>
          <UTextarea
            v-model="rawText"
            placeholder="Paste proxy list here...
192.168.1.1:8080:user:pass
http://user:pass@proxy.example.com:3128
socks5://10.0.0.1:1080:US"
            :rows="10"
            class="w-full font-mono text-sm"
          />
          <template #hint>
            <span class="text-slate-500 text-xs">{{ lineCount }} lines</span>
          </template>
        </UFormField>

        <!-- Import result -->
        <div
          v-if="importResult"
          class="bg-muted border border-muted rounded-xl p-4"
        >
          <p class="text-sm font-semibold text-primary mb-3">Import Result</p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="text-center">
              <p class="text-2xl font-bold text-slate-200">
                {{ importResult.total }}
              </p>
              <p class="text-xs text-muted">Total Lines</p>
            </div>
            <div class="text-center">
              <p
                class="text-2xl font-bold text-emerald-500 dark:text-emerald-400"
              >
                {{ importResult.imported }}
              </p>
              <p class="text-xs text-muted">Success</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-amber-400">
                {{ importResult.duplicates }}
              </p>
              <p class="text-xs text-muted">Duplicates</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-red-500 dark:text-red-400">
                {{ importResult.invalid }}
              </p>
              <p class="text-xs text-muted">Invalid</p>
            </div>
          </div>

          <!-- Error list -->
          <div
            v-if="importResult.errors?.length"
            class="mt-3 pt-3 border-t border-muted"
          >
            <p class="text-xs text-muted mb-2">Invalid Lines:</p>
            <div class="space-y-1 max-h-32 overflow-y-auto">
              <p
                v-for="(err, i) in importResult.errors.slice(0, 10)"
                :key="i"
                class="text-xs text-red-500 dark:text-red-400 font-mono"
              >
                {{ err }}
              </p>
              <p
                v-if="importResult.errors.length > 10"
                class="text-xs text-error/40"
              >
                +{{ importResult.errors.length - 10 }} other errors
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 justify-end pt-1">
          <UButton
            variant="ghost"
            color="neutral"
            size="md"
            @click="handleClose"
          >
            {{ importResult ? "Close" : "Cancel" }}
          </UButton>
          <UButton
            icon="i-heroicons-arrow-up-tray"
            :loading="isImporting"
            :disabled="!rawText.trim()"
            color="primary"
            size="md"
            class="text-white"
            @click="handleImport"
          >
            Import {{ lineCount > 0 ? `(${lineCount})` : "" }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

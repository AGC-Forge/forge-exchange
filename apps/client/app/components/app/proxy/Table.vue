<script lang="ts" setup>
const emit = defineEmits<{
  (e: "test", proxyId: string): void;
  (e: "delete", proxy: ProxyItem): void;
  (e: "onPageChange", page: number): void;
  (e: "bulkDelete", proxyIds: string[]): void;
}>();
const props = defineProps<{
  proxies?: ProxyItem[];
  meta?: ApiMeta;
  isActing: Record<string, boolean>;
  error?: Error | null;
  currentPage: number;
}>();

const selectedIds = ref<Set<string>>(new Set());

const allSelected = computed(() => {
  if (!props.proxies?.length) return false;
  return props.proxies.every((p) => selectedIds.value.has(p.id));
});

const someSelected = computed(() => {
  if (!props.proxies?.length) return false;
  const selected = props.proxies.filter((p) => selectedIds.value.has(p.id));
  return selected.length > 0 && selected.length < props.proxies.length;
});

function toggleSelect(id: string) {
  const next = new Set(selectedIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  selectedIds.value = next;
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value = new Set();
  } else {
    selectedIds.value = new Set(props.proxies?.map((p) => p.id) ?? []);
  }
}

function clearSelection() {
  selectedIds.value = new Set();
}

watch(
  () => props.proxies,
  () => {
    selectedIds.value = new Set();
  }
);

defineExpose({ selectedIds, clearSelection });
</script>

<template>
  <div class="bg-muted border border-muted rounded-xl overflow-hidden">
    <!-- Bulk action bar -->
    <Transition name="slide-down">
      <div
        v-if="selectedIds.size > 0"
        class="flex items-center gap-3 px-5 py-3 bg-primary/10 border-b border-primary/20"
      >
        <span class="text-sm font-medium text-primary">
          {{ selectedIds.size }} selected
        </span>
        <UButton
          color="error"
          variant="solid"
          size="xs"
          icon="i-heroicons-trash"
          class="text-white"
          @click="emit('bulkDelete', [...selectedIds])"
        >
          Delete
        </UButton>
        <UButton
          variant="ghost"
          size="xs"
          @click="clearSelection"
        >
          Clear
        </UButton>
      </div>
    </Transition>

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-muted">
            <!-- Checkbox select all -->
            <th class="px-4 py-3 w-10">
              <UCheckbox
                :model-value="allSelected"
                :indeterminate="someSelected"
                @update:model-value="toggleSelectAll"
              />
            </th>
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
            :selected="selectedIds.has(proxy.id)"
            @test="emit('test', proxy.id)"
            @delete="emit('delete', proxy)"
            @toggle-select="toggleSelect(proxy.id)"
          />
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div
      v-if="meta && meta?.totalPages > 1"
      class="flex justify-center py-4 border-t border-muted"
    >
      <UPagination
        v-model:page="currentPage"
        :total="meta.total"
        :items-per-page="meta.limit"
        @update:page="emit('onPageChange', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  max-height: 60px;
}
</style>
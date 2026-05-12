<script setup lang="ts">
const props = defineProps<{
  modelValue: CustomClickTarget[];
  enabled: boolean;
  maxTargets?: number;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: CustomClickTarget[]): void;
  (e: "update:enabled", value: boolean): void;
  (e: "update:click-order", value: string): void;
  (e: "update:max-per-session", value: number): void;
}>();

const MAX = props.maxTargets ?? 10;

// ── Selector type definitions ─────────────────────────────────
const SELECTOR_TYPES = [
  {
    value: "css",
    label: "CSS Selector",
    icon: "i-heroicons-code-bracket",
    placeholder: ".btn-primary, .cta-button",
    hint: "Contoh: .subscribe-btn, .cta, header > nav a",
    color: "text-blue-400",
  },
  {
    value: "id",
    label: "ID Selector",
    icon: "i-heroicons-hashtag",
    placeholder: "#subscribe-btn",
    hint: "Contoh: #cta-button, #signup-form",
    color: "text-emerald-400",
  },
  {
    value: "attribute",
    label: "Attribute Selector",
    icon: "i-heroicons-tag",
    placeholder: '[data-testid="cta"]',
    hint: "Contoh: [data-action='subscribe'], [aria-label='Close']",
    color: "text-purple-400",
  },
  {
    value: "text",
    label: "Text Content",
    icon: "i-heroicons-cursor-arrow-ripple",
    placeholder: "Daftar Sekarang",
    hint: "Playwright akan cari elemen dengan teks ini (case-insensitive)",
    color: "text-amber-400",
  },
  {
    value: "xpath",
    label: "XPath",
    icon: "i-heroicons-bars-4",
    placeholder: "//button[contains(text(),'Subscribe')]",
    hint: "Contoh: //a[@class='btn']//span",
    color: "text-red-400",
  },
] as const;

type SelectorType = (typeof SELECTOR_TYPES)[number]["value"];

// ── Local state ───────────────────────────────────────────────
const targets = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const isEnabled = computed({
  get: () => props.enabled,
  set: (v) => emit("update:enabled", v),
});

// Per-row edit state
const editingIdx = ref<number | null>(null);

// ── Build Playwright selector string ─────────────────────────
function buildPlaywrightSelector(target: CustomClickTarget): string {
  switch (target.selectorType) {
    case "css":
      return target.selector;
    case "id":
      // Normalize: strip leading # if user typed it, then add
      return `#${target.selector.replace(/^#/, "")}`;
    case "attribute":
      return target.selector;
    case "text":
      return `text=${target.selector}`;
    case "xpath":
      return `xpath=${target.selector}`;
    default:
      return target.selector;
  }
}

// ── Preview selector string ────────────────────────────────────
function selectorPreview(target: CustomClickTarget): string {
  if (!target.selector) return "";
  return buildPlaywrightSelector(target);
}

function getTypeDef(type: SelectorType) {
  return SELECTOR_TYPES.find((t) => t.value === type) ?? SELECTOR_TYPES[0];
}

// ── CRUD ─────────────────────────────────────────────────────
function addTarget() {
  if (targets.value.length >= MAX) return;
  const newTargets = [
    ...targets.value,
    {
      selector: "",
      selectorType: "css" as SelectorType,
      clickRate: 70,
      waitBefore: 1500,
      waitAfter: 1000,
      description: "",
    },
  ];
  emit("update:modelValue", newTargets);
  editingIdx.value = newTargets.length - 1;
}

function removeTarget(idx: number) {
  const newTargets = targets.value.filter((_, i) => i !== idx);
  emit("update:modelValue", newTargets);
  if (editingIdx.value === idx) editingIdx.value = null;
}

function updateTarget(idx: number, field: keyof CustomClickTarget, value: any) {
  const newTargets = targets.value.map((t, i) =>
    i === idx ? { ...t, [field]: value } : t,
  );
  emit("update:modelValue", newTargets);
}

function moveUp(idx: number) {
  if (idx === 0) return;
  const arr = [...targets.value];
  // @ts-ignore
  [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
  emit("update:modelValue", arr);
}

function moveDown(idx: number) {
  if (idx === targets.value.length - 1) return;
  const arr = [...targets.value];
  // @ts-ignore
  [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
  emit("update:modelValue", arr);
}

// ── Validation ────────────────────────────────────────────────
function isValid(target: CustomClickTarget): boolean {
  return target.selector.trim().length > 0;
}
</script>

<template>
  <div class="space-y-4">
    <!-- Toggle header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <USwitch v-model="isEnabled" />
        <div>
          <p class="text-sm font-medium">Custom Element Click</p>
          <p class="text-xs text-muted">
            Playwright will click on a specific element on the target page.
          </p>
        </div>
      </div>
      <UBadge v-if="isEnabled" color="primary" variant="soft" size="xs">
        {{ targets.length }}/{{ MAX }} targets
      </UBadge>
    </div>

    <!-- Content (hanya tampil kalau enabled) -->
    <Transition name="fade">
      <div v-if="isEnabled" class="space-y-3">
        <!-- Info box: selector types -->
        <div class="p-3 bg-secondary/10 border border-secondary/20 rounded-xl">
          <p
            class="text-xs font-semibold text-muted uppercase tracking-wide mb-2"
          >
            Selector types supported by Playwright:
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <div
              v-for="st in SELECTOR_TYPES"
              :key="st.value"
              class="flex items-center gap-2 text-xs"
            >
              <UIcon
                :name="st.icon"
                class="w-3.5 h-3.5 shrink-0"
                :class="st.color"
              />
              <span class="font-medium" :class="st.color">{{ st.label }}</span>
              <span class="text-muted font-mono truncate">{{
                st.placeholder
              }}</span>
            </div>
          </div>
        </div>

        <!-- Target list -->
        <div v-if="targets.length > 0" class="space-y-2">
          <div
            v-for="(target, idx) in targets"
            :key="idx"
            class="border rounded-xl overflow-hidden transition-all"
            :class="
              editingIdx === idx
                ? 'border-primary/40 bg-primary/5'
                : isValid(target)
                  ? 'border-secondary/20 bg-secondary/5'
                  : 'border-warning/30 bg-warning/5'
            "
          >
            <!-- Collapsed row -->
            <div
              class="flex items-center gap-3 px-4 py-3 cursor-pointer"
              @click="editingIdx = editingIdx === idx ? null : idx"
            >
              <!-- Drag indicator + order -->
              <div class="flex flex-col gap-0.5">
                <UButton
                  icon="i-heroicons-chevron-up"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  class="p-0.5 h-4"
                  :disabled="idx === 0"
                  @click.stop="moveUp(idx)"
                />
                <UButton
                  icon="i-heroicons-chevron-down"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  class="p-0.5 h-4"
                  :disabled="idx === targets.length - 1"
                  @click.stop="moveDown(idx)"
                />
              </div>

              <span class="text-xs text-muted w-5 text-center font-mono">
                {{ idx + 1 }}
              </span>

              <!-- Type badge -->
              <UBadge
                :color="isValid(target) ? 'neutral' : 'warning'"
                variant="soft"
                size="xs"
                :icon="getTypeDef(target.selectorType).icon"
              >
                {{ getTypeDef(target.selectorType).label }}
              </UBadge>

              <!-- Selector preview -->
              <div class="flex-1 min-w-0">
                <p
                  v-if="isValid(target)"
                  class="text-sm font-mono text-muted truncate"
                >
                  {{ selectorPreview(target) }}
                </p>
                <p v-else class="text-sm text-warning-400">
                  ⚠ Selector not filled in.
                </p>
                <p
                  v-if="target.description"
                  class="text-xs text-muted truncate mt-0.5"
                >
                  {{ target.description }}
                </p>
              </div>

              <!-- Click rate pill -->
              <span
                class="text-xs font-medium bg-secondary/20 px-2 py-0.5 rounded-full shrink-0"
              >
                {{ target.clickRate }}% click
              </span>

              <!-- Expand icon -->
              <UIcon
                :name="
                  editingIdx === idx
                    ? 'i-heroicons-chevron-up'
                    : 'i-heroicons-chevron-down'
                "
                class="w-4 h-4 text-muted shrink-0"
              />
            </div>

            <!-- Expanded editor -->
            <Transition name="slide-down">
              <div
                v-if="editingIdx === idx"
                class="border-t border-secondary/20 p-4 space-y-4"
              >
                <!-- Selector Type selector -->
                <div class="space-y-2">
                  <label
                    class="text-xs font-medium text-muted uppercase tracking-wide"
                  >
                    Selector Type
                  </label>
                  <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <button
                      v-for="st in SELECTOR_TYPES"
                      :key="st.value"
                      type="button"
                      class="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all"
                      :class="
                        target.selectorType === st.value
                          ? 'border-primary/50 bg-primary/10 text-primary'
                          : 'border-secondary/20 text-muted hover:border-secondary/40'
                      "
                      @click="updateTarget(idx, 'selectorType', st.value)"
                    >
                      <UIcon :name="st.icon" class="w-3.5 h-3.5 shrink-0" />
                      <span class="hidden sm:block truncate">{{
                        st.label
                      }}</span>
                      <span class="sm:hidden">{{
                        st.label.split(" ")[0]
                      }}</span>
                    </button>
                  </div>
                  <!-- Hint -->
                  <p class="text-xs text-muted">
                    <span class="font-medium">Hint: </span>
                    {{ getTypeDef(target.selectorType).hint }}
                  </p>
                </div>

                <!-- Selector input -->
                <UFormField
                  :label="getTypeDef(target.selectorType).label"
                  name="selector"
                  required
                >
                  <div class="relative">
                    <UInput
                      :model-value="target.selector"
                      :placeholder="getTypeDef(target.selectorType).placeholder"
                      class="w-full font-mono text-sm"
                      size="lg"
                      @update:model-value="
                        updateTarget(idx, 'selector', $event)
                      "
                    >
                      <template #leading>
                        <UIcon
                          :name="getTypeDef(target.selectorType).icon"
                          class="w-4 h-4"
                          :class="getTypeDef(target.selectorType).color"
                        />
                      </template>
                    </UInput>
                  </div>
                  <!-- Playwright selector preview -->
                  <div
                    v-if="isValid(target)"
                    class="mt-1.5 px-3 py-1.5 bg-secondary/10 rounded-lg"
                  >
                    <p class="text-xs text-muted">
                      <span class="font-medium">Playwright:</span>
                      <code class="ml-1 font-mono text-primary">
                        page.locator('{{ selectorPreview(target) }}')
                      </code>
                    </p>
                  </div>
                </UFormField>

                <!-- Description -->
                <UFormField label="Description (optional)" name="description">
                  <UInput
                    :model-value="target.description ?? ''"
                    placeholder="Example: CTA button primary, subscribe subscribe button"
                    class="w-full"
                    @update:model-value="
                      updateTarget(idx, 'description', $event)
                    "
                  />
                </UFormField>

                <!-- Click rate + timing row -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <UFormField name="clickRate" required>
                    <template #label>
                      <span>Click Rate</span>
                      <span class="ml-1 text-muted font-normal text-xs"
                        >({{ target.clickRate }}%)</span
                      >
                    </template>
                    <div class="space-y-1.5">
                      <USlider
                        :model-value="target.clickRate"
                        :min="5"
                        :max="100"
                        :step="5"
                        @update:model-value="
                          updateTarget(idx, 'clickRate', $event)
                        "
                      />
                      <div class="flex justify-between text-xs text-muted">
                        <span>5% (sometimes)</span>
                        <span>100% (always)</span>
                      </div>
                    </div>
                  </UFormField>

                  <UFormField label="Wait Before (ms)" name="waitBefore">
                    <UInput
                      type="number"
                      :model-value="target.waitBefore"
                      :min="0"
                      :max="30000"
                      :step="500"
                      class="w-full"
                      @update:model-value="
                        updateTarget(idx, 'waitBefore', Number($event))
                      "
                    />
                    <template #hint>
                      <span class="text-xs text-muted">Wait before click</span>
                    </template>
                  </UFormField>

                  <UFormField label="Wait After (ms)" name="waitAfter">
                    <UInput
                      type="number"
                      :model-value="target.waitAfter"
                      :min="0"
                      :max="30000"
                      :step="500"
                      class="w-full"
                      @update:model-value="
                        updateTarget(idx, 'waitAfter', Number($event))
                      "
                    />
                    <template #hint>
                      <span class="text-xs text-muted">Wait after click</span>
                    </template>
                  </UFormField>
                </div>

                <!-- Delete row -->
                <div class="flex justify-end pt-1">
                  <UButton
                    icon="i-heroicons-trash"
                    color="error"
                    variant="ghost"
                    size="sm"
                    @click="removeTarget(idx)"
                  >
                    Delete this target
                  </UButton>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-else
          class="border-2 border-dashed border-secondary/20 rounded-xl p-8 text-center"
        >
          <UIcon
            name="i-heroicons-cursor-arrow-ripple"
            class="w-8 h-8 text-muted mx-auto mb-2"
          />
          <p class="text-sm text-muted">No custom click target</p>
          <p class="text-xs text-muted mt-0.5">
            Add elements that visitors want to click on
          </p>
        </div>

        <!-- Add button -->
        <UButton
          v-if="targets.length < MAX"
          icon="i-heroicons-plus"
          color="primary"
          variant="soft"
          size="sm"
          @click="addTarget"
        >
          Add click target
        </UButton>

        <!-- Click order + max per session -->
        <div
          v-if="targets.length > 1"
          class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-secondary/20"
        >
          <UFormField label="Click order" name="clickOrder">
            <USelect
              :model-value="($attrs.clickOrder as string) ?? 'sequential'"
              :items="[
                { label: '📋 Sequential (ordered)', value: 'sequential' },
                { label: '🎲 Random (random)', value: 'random' },
              ]"
              class="w-full"
              @change="
                (e) => {
                  const val = (e.target as HTMLSelectElement | null)?.value;
                  if (val) {
                    $emit('update:click-order', val);
                  }
                }
              "
            />
          </UFormField>
          <UFormField label="Max clicks per Session" name="maxPerSession">
            <UInput
              type="number"
              :model-value="($attrs.maxPerSession as number | undefined) ?? 3"
              :min="1"
              :max="10"
              class="w-full"
              @change="
                (e) => {
                  const val = (e.target as HTMLInputElement | null)?.value;
                  if (val) {
                    $emit('update:max-per-session', Number(val));
                  }
                }
              "
            />
          </UFormField>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
  max-height: 800px;
}
.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>

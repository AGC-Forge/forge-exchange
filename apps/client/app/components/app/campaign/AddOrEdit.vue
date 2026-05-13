<script setup lang="ts">
type FieldInputType = "text" | "password" | "url";

export interface IntegrationFieldDef {
  key: string;
  label: string;
  type: FieldInputType;
  placeholder: string;
  required: boolean;
  hint?: string;
}

export interface IntegrationDef {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  color: string;
  docsUrl?: string;
  fields: IntegrationFieldDef[];
}

const props = defineProps<{
  open: boolean;
  title: string;
  def: IntegrationDef | null;
  mode: "create" | "edit";
  loading?: boolean;
  initialName?: string;
  initialCredentials?: Record<string, string>;
  secretFlags?: Record<string, boolean>;
}>();

const emit = defineEmits<{
  (e: "update:open", v: boolean): void;
  (e: "submit", v: { name: string; credentials: Record<string, string> }): void;
  (e: "invalid", v: { message: string; errors: string[] }): void;
}>();

const name = ref("");
const form = reactive<Record<string, string>>({});

watch(
  () => [props.open, props.initialName, props.initialCredentials, props.def] as const,
  ([open]) => {
    if (!open) return;
    name.value = props.initialName ?? props.def?.name ?? "";
    if (props.def) {
      for (const f of props.def.fields) form[f.key] = "";
      if (props.initialCredentials) {
        for (const [k, v] of Object.entries(props.initialCredentials)) {
          if (form[k] !== undefined) form[k] = v;
        }
      }
    }
  },
  { immediate: true },
);

function close() {
  emit("update:open", false);
}

function validate(): string[] {
  if (!props.def) return ["Provider belum dipilih"];
  const errors: string[] = [];
  for (const field of props.def.fields) {
    if (!field.required) continue;
    const v = (form[field.key] ?? "").trim();
    if (!v) errors.push(`${field.label} wajib diisi`);
  }
  return errors;
}

function submit() {
  const errors = validate();
  if (errors.length > 0) {
    emit("invalid", { message: errors[0] ?? "Invalid input", errors });
    return;
  }
  emit("submit", { name: name.value, credentials: { ...form } });
}
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    :ui="{ wrapper: 'sm:max-w-md' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div v-if="def" class="space-y-4">
        <div
          class="flex items-center gap-3 p-3 rounded-lg bg-secondary/10 border border-secondary/20"
        >
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            :class="`bg-${def.color}-500/15`"
          >
            <UIcon
              :name="def.icon"
              class="w-4 h-4"
              :class="`text-${def.color}-400`"
            />
          </div>
          <div>
            <p class="text-sm font-medium">{{ def.name }}</p>
            <p class="text-xs text-muted">{{ def.description }}</p>
          </div>
        </div>

        <div>
          <label class="text-xs font-medium text-muted block mb-1">
            Integration Name
          </label>
          <UInput
            v-model="name"
            placeholder="Name (optional)"
            size="md"
            class="w-full"
            icon="material-symbols:text-fields"
          />
        </div>

        <div
          v-for="field in def.fields"
          :key="field.key"
          class="space-y-1 w-full"
        >
          <label class="text-xs font-medium text-muted block">
            <span class="inline-flex items-center gap-2">
              <span>{{ field.label }}</span>
              <UBadge
                v-if="
                  field.type === 'password' &&
                  (props.secretFlags?.[field.key] ?? false) &&
                  !(form[field.key] ?? '').trim()
                "
                size="xs"
                variant="soft"
                color="neutral"
              >
                Saved
              </UBadge>
            </span>
            <span v-if="field.required" class="text-red-400 ml-0.5">*</span>
          </label>
          <UInput
            v-model="form[field.key]"
            :type="field.type"
            :placeholder="field.placeholder"
            size="md"
            icon="material-symbols:edit-square-outline"
            class="w-full"
          />
          <p v-if="field.hint" class="text-xs text-muted/70">
            {{ field.hint }}
          </p>
        </div>

        <a
          v-if="def.docsUrl"
          :href="def.docsUrl"
          target="_blank"
          class="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <UIcon
            name="i-heroicons-arrow-top-right-on-square"
            class="w-3.5 h-3.5"
          />
          See docs for {{ def.name }}
        </a>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" size="md" @click="close">
          Cancel
        </UButton>
        <UButton
          color="primary"
          :loading="loading"
          icon="material-symbols:power-plug"
          size="md"
          class="text-white"
          @click="submit"
        >
          {{ mode === "edit" ? "Save Changes" : "Connect" }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

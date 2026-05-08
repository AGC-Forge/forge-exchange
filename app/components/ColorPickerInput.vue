<script setup lang="ts">
import type { HTMLAttributes } from "vue";

const emits = defineEmits<{
  (event: "update:value", value: string): void;
}>();
const props = withDefaults(
  defineProps<{
    label?: string;
    value?: string;
    name?: string;
    error?: string;
    class?: HTMLAttributes["class"];
    required?: boolean;
    placeholder?: string;
    icon?: string;
    disabled?: boolean;
  }>(),
  {
    label: "Color Picker",
    value: "#00C16A",
    name: "",
    error: "",
    class: "",
    required: false,
    placeholder: "Select Color",
    icon: "heroicons:swatch",
    disabled: false,
  },
);
const modelValue = useVModel(props, "value", emits, {
  passive: true,
  defaultValue: "#00C16A",
});
const chip = computed(() => ({ backgroundColor: modelValue.value }));
</script>
<template>
  <UFormField
    :label="label"
    :class="cn('w-full', props.class)"
    :required="required"
    :error="error"
  >
    <UInput type="hidden" :value="modelValue" :name="name" />
    <UPopover>
      <UButton
        :label="label"
        color="neutral"
        variant="outline"
        class="w-full"
        :disabled="disabled"
      >
        <template #leading>
          <UIcon :name="icon" class="size-4" />
          <span :style="chip" class="size-3 h-4 w-4 rounded-full" />
        </template>
      </UButton>

      <template #content>
        <UColorPicker v-model="modelValue" class="w-full p-2" />
      </template>
    </UPopover>
  </UFormField>
</template>

<style scoped></style>

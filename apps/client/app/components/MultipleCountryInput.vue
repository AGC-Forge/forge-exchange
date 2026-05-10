<script setup lang="ts">
import type { HTMLAttributes } from "vue";

const emits = defineEmits<{
  (event: "update:value", value: string[]): void;
}>();

const props = withDefaults(
  defineProps<{
    label?: string;
    value?: string[];
    name?: string;
    error?: string;
    class?: HTMLAttributes["class"];
    required?: boolean;
    placeholder?: string;
    icon?: string;
  }>(),
  {
    label: "Country Picker",
    value: () => ["ID"],
    name: "",
    error: "",
    class: "",
    required: false,
    placeholder: "Select Country",
    icon: "material-symbols:globe",
  },
);

const modelValue = useVModel(props, "value", emits, {
  passive: true,
  defaultValue: ["ID"],
});

const isOpen = ref(false);
const searchQuery = ref("");
const inputRef = ref<HTMLInputElement | null>(null);

const {
  data: countries,
  status,
  execute,
} = await useLazyFetch<CountryItem[]>("/api/public/countries", {
  immediate: false,
  server: false,
});

watch([countries, modelValue], ([countriesData, modelVal]) => {
  if (countriesData && modelVal) {
    // console.log("Countries loaded, modelValue:", modelVal);
    // console.log(
    // 	"Available countries:",
    // 	countriesData.map((c) => c.code),
    // );
  }
});

const filteredCountries = computed(() => {
  if (!countries.value) return [];
  if (!searchQuery.value) return countries.value;

  const query = searchQuery.value.toLowerCase();
  return countries.value.filter(
    (country) =>
      country.name.toLowerCase().includes(query) ||
      country.code.toLowerCase().includes(query),
  );
});

const selectedCountries = computed(() => {
  if (!countries.value) return [];

  return modelValue.value
    .map((code) =>
      countries.value!.find((c) => c.code.toLowerCase() === code.toLowerCase()),
    )
    .filter(Boolean) as CountryItem[];
});

onMounted(() => {
  if (!countries.value) {
    execute();
  }
});

function toggleCountry(country: CountryItem) {
  const index = modelValue.value.indexOf(country.code);

  if (index > -1) {
    // Remove
    modelValue.value = modelValue.value.filter((code) => code !== country.code);
  } else {
    // Add (no duplicates)
    modelValue.value = [...modelValue.value, country.code];
  }
}

function isSelected(country: CountryItem): boolean {
  return modelValue.value.includes(country.code);
}

function removeTag(code: string) {
  modelValue.value = modelValue.value.filter((c) => c !== code);
}

function openDropdown() {
  if (!countries.value?.length) {
    execute();
  }
  isOpen.value = true;
  nextTick(() => {
    inputRef.value?.focus();
  });
}

function closeDropdown() {
  isOpen.value = false;
  searchQuery.value = "";
}

onClickOutside(inputRef, () => {
  closeDropdown();
});
</script>

<template>
  <div :class="cn('w-full', props.class)">
    <!-- Label -->
    <label
      v-if="label"
      class="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-200"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>

    <!-- Input Container -->
    <div class="relative">
      <!-- Tags Input -->
      <div
        class="focus-within:ring-primary-500 dark:bg-default w-full cursor-text rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm transition-all focus-within:border-transparent focus-within:ring-2 dark:border-neutral-600"
        @click="openDropdown"
      >
        <!-- Selected Tags -->
        <div class="flex flex-wrap items-center gap-1.5">
          <!-- Icon -->
          <Icon
            v-if="icon"
            :name="icon"
            class="h-5 w-5 shrink-0 text-neutral-400"
          />

          <!-- Tags -->
          <div
            v-for="country in selectedCountries"
            :key="country.code"
            class="inline-flex items-center justify-center gap-1 rounded-md bg-sky-700 px-2 py-1 text-sm text-white"
          >
            <span class="text-sm">{{ country.emoji }}</span>
            <span class="font-semibold">{{ country.code }}</span>
            <button
              type="button"
              class="ml-1 text-white"
              @click.stop="removeTag(country.code)"
            >
              <Icon name="lucide:x" class="h-3 w-3" />
            </button>
          </div>

          <!-- Placeholder -->
          <span
            v-if="!selectedCountries.length"
            class="text-neutral-400 select-none"
          >
            {{ placeholder }}
          </span>
        </div>
      </div>

      <!-- Dropdown -->
      <Transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
      >
        <div
          v-if="isOpen"
          class="absolute z-50 mt-1 w-full rounded-md border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
        >
          <!-- Search Input -->
          <div class="border-b border-neutral-200 p-2 dark:border-neutral-700">
            <div class="relative">
              <Icon
                name="lucide:search"
                class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
              />
              <input
                ref="inputRef"
                v-model="searchQuery"
                type="text"
                placeholder="Search country..."
                class="focus:ring-primary-500 w-full rounded-md border border-neutral-300 bg-white py-2 pr-3 pl-9 text-sm outline-none focus:border-transparent focus:ring-2 dark:border-neutral-600 dark:bg-neutral-900"
              />
            </div>
          </div>

          <!-- Countries List -->
          <div class="max-h-60 overflow-y-auto p-1">
            <!-- Loading State -->
            <div
              v-if="status === 'pending'"
              class="flex items-center justify-center py-8"
            >
              <Icon
                name="lucide:loader-2"
                class="h-6 w-6 animate-spin text-neutral-400"
              />
            </div>

            <!-- Empty State -->
            <div
              v-else-if="!filteredCountries.length"
              class="py-8 text-center text-sm text-neutral-500"
            >
              No countries found
            </div>

            <!-- Country Items -->
            <button
              v-for="country in filteredCountries"
              :key="country.code"
              type="button"
              class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
              :class="{
                'bg-primary-50 dark:bg-primary-900/20': isSelected(country),
              }"
              @click="toggleCountry(country)"
            >
              <!-- Checkbox -->
              <div
                class="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2"
                :class="
                  isSelected(country)
                    ? 'bg-primary-500 border-primary-500'
                    : 'border-neutral-300 dark:border-neutral-600'
                "
              >
                <Icon
                  v-if="isSelected(country)"
                  name="lucide:check"
                  class="h-3 w-3 text-white"
                />
              </div>

              <!-- Emoji -->
              <span class="shrink-0 text-xl">{{ country.emoji }}</span>

              <!-- Country Info -->
              <div class="min-w-0 flex-1">
                <div
                  class="text-sm font-medium text-neutral-900 dark:text-neutral-100"
                >
                  {{ country.name }}
                </div>
                <div class="text-xs text-neutral-500 dark:text-neutral-400">
                  {{ country.code }}
                </div>
              </div>
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Error Message -->
    <p v-if="error" class="mt-1 text-sm text-red-600 dark:text-red-400">
      {{ error }}
    </p>

    <!-- Hidden Input for Form -->
    <input
      v-for="(code, index) in modelValue"
      :key="code"
      type="hidden"
      :name="`${name}[${index}]`"
      :value="code"
    />
  </div>
</template>

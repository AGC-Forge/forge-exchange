<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "admin",
});
useSeoMeta({
  title: "Settings",
  description: "Manage your account settings.",
  robots: "noindex, nofollow",
});

const { $settings: settingState } = useNuxtApp();
const settings = computed(() => settingState);

const toast = useToast();
const defaultGeneralSettings = {
  site_theme: "dark" as "light" | "dark" | "system",
  is_maintenance: false,
  enable_register: false,
  enable_github_provider: false,
  enable_google_provider: false,
  max_upload_size_mb: 100,
  max_upload_image_mb: 100,
  max_upload_video_mb: 100,
  max_upload_audio_mb: 100,
  max_upload_document_mb: 20,
  max_upload_code_mb: 5,
  max_upload_archive_mb: 1000,
};

const { handleSubmit, isSubmitting, errors, setValues, meta } = useForm({
  validationSchema: GeneralSettingSchema,
  initialValues: defaultGeneralSettings,
});

watch(
  settings,
  (value) => {
    if (!value) return;
    setValues({
      site_theme:
        value.site_theme === "light" ||
        value.site_theme === "dark" ||
        value.site_theme === "system"
          ? value.site_theme
          : "dark",
      is_maintenance: Boolean(value.is_maintenance),
      enable_register: Boolean(value.enable_register),
      enable_github_provider: Boolean(value.enable_github_provider),
      enable_google_provider: Boolean(value.enable_google_provider),
      max_upload_size_mb: Number(value.max_upload_size_mb ?? 100),
      max_upload_image_mb: Number(value.max_upload_image_mb ?? 100),
      max_upload_video_mb: Number(value.max_upload_video_mb ?? 100),
      max_upload_audio_mb: Number(value.max_upload_audio_mb ?? 100),
      max_upload_document_mb: Number(value.max_upload_document_mb ?? 20),
      max_upload_code_mb: Number(value.max_upload_code_mb ?? 5),
      max_upload_archive_mb: Number(value.max_upload_archive_mb ?? 1000),
    });
  },
  { immediate: true },
);
const { value: site_theme } = useField<string>("site_theme");
const { value: is_maintenance } = useField<boolean>("is_maintenance");
const { value: enable_register } = useField<boolean>("enable_register");
const { value: enable_github_provider } = useField<boolean>(
  "enable_github_provider",
);
const { value: enable_google_provider } = useField<boolean>(
  "enable_google_provider",
);
const { value: max_upload_size_mb } = useField<number>("max_upload_size_mb");
const { value: max_upload_image_mb } = useField<number>("max_upload_image_mb");
const { value: max_upload_video_mb } = useField<number>("max_upload_video_mb");
const { value: max_upload_audio_mb } = useField<number>("max_upload_audio_mb");
const { value: max_upload_document_mb } = useField<number>(
  "max_upload_document_mb",
);
const { value: max_upload_code_mb } = useField<number>("max_upload_code_mb");
const { value: max_upload_archive_mb } = useField<number>(
  "max_upload_archive_mb",
);

const submit = handleSubmit(async (value) => {
  try {
    const payload = Object.entries(value).map(([key, val]) => ({
      group_name: key.startsWith("max_upload")
        ? "storage"
        : key.startsWith("enable_")
          ? "auth"
          : "general",
      key,
      value: val,
    }));

    const res = await updateSettings({ updates: payload });
    if (!res?.success) {
      throw new Error(res?.message || "Failed to update settings");
    }
    toast.add({
      title: "Success",
      description: "Settings updated successfully",
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Error",
      description:
        error instanceof Error ? error.message : "Failed to update settings",
      color: "error",
    });
  }
});
</script>

<template>
  <AppSettingLayout>
    <UPageCard
      title="General Settings"
      description="Update your general settings."
      variant="naked"
      class="mb-4"
    >
      <UPageCard
        variant="subtle"
        :ui="{ container: 'divide-y divide-default' }"
      >
        <form class="w-full space-y-4" @submit.prevent="submit">
          <div class="grid w-full gap-2 pb-4">
            <UFormField
              label="Site Theme"
              required
              class="w-full"
              :error="errors.site_theme"
            >
              <USelect
                v-model="site_theme"
                name="site_theme"
                class="w-full"
                :items="[
                  { label: 'Light', value: 'light' },
                  { label: 'Dark', value: 'dark' },
                  { label: 'System', value: 'system' },
                ]"
                variant="outline"
                icon="material-symbols:palette"
              />
            </UFormField>
          </div>
          <div class="grid w-full gap-2 pb-4">
            <UFormField
              label="Maintenance Status"
              class="w-full"
              :error="errors.is_maintenance"
            >
              <USwitch
                v-model="is_maintenance"
                description="Set maintenance mode on the site."
              />
            </UFormField>
          </div>
          <div class="grid w-full gap-2 pb-4">
            <UFormField
              label="Enable Register"
              class="w-full"
              :error="errors.enable_register"
            >
              <USwitch
                v-model="enable_register"
                description="Enable register on the site."
              />
            </UFormField>
          </div>
          <div class="grid w-full gap-2 pb-4">
            <UFormField
              label="Enable GitHub Provider"
              class="w-full"
              :error="errors.enable_github_provider"
            >
              <USwitch
                v-model="enable_github_provider"
                description="Enable GitHub provider on the site."
              />
            </UFormField>
          </div>
          <div class="grid w-full gap-2 pb-4">
            <UFormField
              label="Enable Google Provider"
              class="w-full"
              :error="errors.enable_google_provider"
            >
              <USwitch
                v-model="enable_google_provider"
                description="Enable Google provider on the site."
              />
            </UFormField>
          </div>
          <div class="grid w-full gap-2 pb-4">
            <UFormField
              label="Max Upload Size (MB)"
              required
              class="w-full"
              :error="errors.max_upload_size_mb"
            >
              <UInput
                v-model="max_upload_size_mb"
                name="max_upload_size_mb"
                placeholder="Enter max upload size in MB"
                class="w-full"
                variant="outline"
                icon="material-symbols:upload"
                autocomplete="number"
              />
            </UFormField>
          </div>
          <div class="grid w-full gap-2 pb-4">
            <UFormField
              label="Max Upload Image Size (MB)"
              required
              class="w-full"
              :error="errors.max_upload_image_mb"
            >
              <UInput
                v-model="max_upload_image_mb"
                name="max_upload_image_mb"
                placeholder="Enter max upload image size in MB"
                class="w-full"
                variant="outline"
                icon="material-symbols:upload"
                autocomplete="number"
              />
            </UFormField>
          </div>
          <div class="grid w-full gap-2 pb-4">
            <UFormField
              label="Max Upload Video Size (MB)"
              required
              class="w-full"
              :error="errors.max_upload_video_mb"
            >
              <UInput
                v-model="max_upload_video_mb"
                name="max_upload_video_mb"
                placeholder="Enter max upload video size in MB"
                class="w-full"
                variant="outline"
                icon="material-symbols:upload"
                autocomplete="number"
              />
            </UFormField>
          </div>
          <div class="grid w-full gap-2 pb-4">
            <UFormField
              label="Max Upload Audio Size (MB)"
              required
              class="w-full"
              :error="errors.max_upload_audio_mb"
            >
              <UInput
                v-model="max_upload_audio_mb"
                name="max_upload_audio_mb"
                placeholder="Enter max upload audio size in MB"
                class="w-full"
                variant="outline"
                icon="material-symbols:upload"
                autocomplete="number"
              />
            </UFormField>
          </div>
          <div class="grid w-full gap-2 pb-4">
            <UFormField
              label="Max Upload Document Size (MB)"
              required
              class="w-full"
              :error="errors.max_upload_document_mb"
            >
              <UInput
                v-model="max_upload_document_mb"
                name="max_upload_document_mb"
                placeholder="Enter max upload document size in MB"
                class="w-full"
                variant="outline"
                icon="material-symbols:upload"
                autocomplete="number"
              />
            </UFormField>
          </div>
          <div class="grid w-full gap-2 pb-4">
            <UFormField
              label="Max Upload Code Size (MB)"
              required
              class="w-full"
              :error="errors.max_upload_code_mb"
            >
              <UInput
                v-model="max_upload_code_mb"
                name="max_upload_code_mb"
                placeholder="Enter max upload code size in MB"
                class="w-full"
                variant="outline"
                icon="material-symbols:upload"
                autocomplete="number"
              />
            </UFormField>
          </div>
          <div class="grid w-full gap-2 pb-4">
            <UFormField
              label="Max Upload Archive Size (MB)"
              required
              class="w-full"
              :error="errors.max_upload_archive_mb"
            >
              <UInput
                v-model="max_upload_archive_mb"
                name="max_upload_archive_mb"
                placeholder="Enter max upload archive size in MB"
                class="w-full"
                variant="outline"
                icon="material-symbols:upload"
                autocomplete="number"
              />
            </UFormField>
          </div>
          <UButton
            type="submit"
            color="primary"
            size="md"
            class="text-white"
            :loading="isSubmitting"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? "Updating..." : "Update" }}
          </UButton>
          <UBadge
            :color="meta.valid ? 'success' : 'error'"
            variant="soft"
            size="sm"
            class="ml-2"
          >
            {{ meta.valid ? "schema-valid" : "schema-invalid" }}
          </UBadge>
        </form>
      </UPageCard>
    </UPageCard>
  </AppSettingLayout>
</template>

<style scoped></style>

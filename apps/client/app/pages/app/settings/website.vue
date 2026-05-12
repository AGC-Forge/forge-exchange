<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Website Settings",
  description: "Manage your website settings.",
  robots: "noindex, nofollow",
});
const {
  data: settings,
  pending: isPending,
  refresh: refreshPublicSettings,
} = usePublicSettings();

const toast = useToast();

const keywordsInput = ref<string[]>(
  settings.value?.site_keywords?.split(",") ?? [],
);
const iconFile = ref<File | null>(null);
const logoFile = ref<File | null>(null);
const faviconFile = ref<File | null>(null);

const { handleSubmit, isSubmitting, errors, validateField, setValues } =
  useForm({
    validationSchema: WebSettingsSchema,
    initialValues: {
      site_name: "",
      site_description: "",
      site_keywords: "",
      site_icon: "",
      site_logo: "",
      site_favicon: "",
    },
  });

onMounted(() => {
  watch(
    settings,
    (value) => {
      if (!value) return;
      keywordsInput.value = value.site_keywords?.split(",") ?? [];
      setValues({
        site_name: value.site_name || "",
        site_description: value.site_description || "",
        site_keywords: value.site_keywords || "",
        site_icon: value.site_icon || "",
        site_logo: value.site_logo || "",
        site_favicon: value.site_favicon || "",
      });
    },
    { immediate: true },
  );
});
const { value: site_name } = useField<string>("site_name");
const { value: site_description } = useField<string>("site_description");
const { value: site_keywords } = useField<string>("site_keywords");
const { value: site_icon } = useField<string>("site_icon");
const { value: site_logo } = useField<string>("site_logo");
const { value: site_favicon } = useField<string>("site_favicon");

const submit = handleSubmit(
  async (value) => {
    try {
      const payload = Object.entries(value).map(([key, val]) => ({
        group_name: "general",
        key,
        value: val,
      }));

      const res = await updateSettings({ updates: payload });
      if (!res?.success) {
        throw new Error(res?.message || "Failed to update settings");
      }
      await refreshPublicSettings();
      toast.add({
        title: "Success",
        description: "Settings updated successfully",
        color: "success",
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.add({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update settings",
        color: "error",
      });
    }
  },
  ({ errors: submitErrors }) => {
    console.warn("Website settings form invalid:", submitErrors);
    const firstError =
      Object.values(submitErrors || {}).find(Boolean) ||
      "Please fix invalid fields before submit";
    toast.add({
      title: "Form invalid",
      description: String(firstError),
      color: "warning",
    });
  },
);

const handleKeywordChange = (payload: string[]) => {
  site_keywords.value = payload.join(",");
};
const handleFileUpload = async (
  field: "site_icon" | "site_logo" | "site_favicon",
  file?: File | null,
) => {
  if (!file) return;

  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const maxSize = 2 * 1024 * 1024; // 2MB

  if (!validTypes.includes(file.type)) {
    toast.add({
      title: "Error",
      description:
        "Invalid file type. Please upload a JPEG, JPG, PNG, or WebP image.",
      color: "error",
    });
    return;
  }
  if (file.size > maxSize) {
    toast.add({
      title: "Error",
      description: "File size exceeds 2MB limit.",
      color: "error",
    });
    return;
  }

  if (file) {
    await handleUpload(field, file);
  }
};
async function handleUpload(
  field: "site_icon" | "site_logo" | "site_favicon",
  file?: File | null,
) {
  if (!file) return;

  const oldValue =
    field === "site_icon"
      ? site_icon.value
      : field === "site_logo"
        ? site_logo.value
        : site_favicon.value;

  if (oldValue.trim() !== "" && !oldValue.includes("cloudinary.com")) {
    await deleteImage(oldValue);
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await $fetch<{
      success: boolean;
      message?: string;
      data?: { url?: string };
    }>(`/api/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.success) {
      throw new Error(response.message || "Failed to upload image");
    }
    const uploadedUrl = response.data?.url;
    if (!uploadedUrl) {
      throw new Error("Upload success but URL is missing");
    }

    if (field === "site_icon") {
      site_icon.value = uploadedUrl;
    } else if (field === "site_logo") {
      site_logo.value = uploadedUrl;
    } else {
      site_favicon.value = uploadedUrl;
    }

    const saveRes = await updateSettings({
      updates: [
        {
          group_name: "general",
          key: field,
          value: uploadedUrl,
        },
      ],
    });
    if (!saveRes?.success) {
      throw new Error(
        saveRes?.message || "Upload success but failed to save settings",
      );
    }

    await refreshPublicSettings();

    toast.add({
      title: "Success",
      description: "Image uploaded and saved successfully",
      color: "success",
      icon: "ph:check-circle-bold",
    });
  } catch (error) {
    toast.add({
      title: "Error",
      description: error instanceof Error ? error.message : "Upload failed",
      color: "error",
      icon: "ph:x-circle-bold",
    });
  }
}
async function deleteImage(imgUrl: string) {
  try {
    const response = await $fetch(`/api/upload`, {
      method: "DELETE",
      body: {
        url: imgUrl,
      },
    });
    if (!response.success) {
      throw new Error(response.message || "Failed to delete image");
    }
  } catch (error) {
    console.error(error);
  }
}
</script>

<template>
  <AppSettingLayout>
    <UPageCard
      title="Website Settings"
      description="Update your website settings."
      variant="naked"
      class="mb-4"
    >
      <UPageCard
        variant="subtle"
        :ui="{ container: 'divide-y divide-default' }"
      >
        <form
          v-if="!isPending"
          class="w-full space-y-4"
          @submit.prevent="submit"
        >
          <div class="grid w-full gap-2 pb-4">
            <UFormField
              label="Site Name"
              required
              class="w-full"
              :error="errors.site_name"
            >
              <UInput
                v-model="site_name"
                name="site_name"
                placeholder="Enter your site name"
                class="w-full"
                variant="outline"
                icon="material-symbols:person"
                autocomplete="site_name"
              />
            </UFormField>
          </div>
          <div class="grid w-full gap-2 pb-4">
            <UFormField
              label="Site Description"
              required
              class="w-full"
              :error="errors.site_description"
            >
              <UTextarea
                v-model="site_description"
                name="site_description"
                placeholder="Enter your site description"
                class="w-full"
                variant="outline"
                autoresize
                :disabled="isSubmitting"
                autocomplete="on"
              />
            </UFormField>
          </div>
          <div class="grid w-full gap-2 pb-4">
            <UFormField
              label="Site Keywords"
              required
              class="w-full"
              :error="errors.site_keywords"
            >
              <UInputTags
                v-model="keywordsInput"
                name="site_keywords"
                placeholder="Enter your site keywords"
                class="w-full"
                variant="outline"
                icon="material-symbols:tag"
                :disabled="isSubmitting"
                autocomplete="on"
                @update:model-value="handleKeywordChange"
              />
            </UFormField>
          </div>
          <div class="grid w-full gap-2 pb-4">
            <UFormField label="Site Icon" class="w-full">
              <UFileUpload
                v-model="iconFile"
                name="site_icon"
                color="neutral"
                icon="i-heroicons-photo"
                label="Drop your image here"
                description="SVG, PNG, JPG or GIF (max. 2MB)"
                accept="image/*"
                position="inside"
                layout="list"
                class="min-h-32 w-full cursor-pointer"
                @update:model-value="
                  (file) => handleFileUpload('site_icon', file)
                "
              />
            </UFormField>
            <div
              v-if="site_icon"
              class="bg-default my-2 flex w-full items-center gap-3 rounded-lg p-2"
            >
              <img
                :src="site_icon"
                alt="Site Icon Preview"
                class="h-8 w-8 rounded-md"
              />
              <div class="text-default-500 text-sm">Current Site Icon</div>
            </div>
          </div>
          <div class="grid w-full gap-2 pb-4">
            <UFormField label="Site Logo" class="w-full">
              <UFileUpload
                v-model="logoFile"
                name="site_logo"
                color="neutral"
                icon="i-heroicons-photo"
                label="Drop your image here"
                description="SVG, PNG, JPG or GIF (max. 2MB)"
                accept="image/*"
                position="inside"
                layout="list"
                class="min-h-32 w-full cursor-pointer"
                @update:model-value="
                  (file) => handleFileUpload('site_logo', file)
                "
              />
            </UFormField>
            <div
              v-if="site_logo"
              class="bg-default my-2 flex w-full items-center gap-3 rounded-lg p-2"
            >
              <img
                :src="site_logo"
                alt="Site Logo Preview"
                class="h-8 w-8 rounded-md"
              />
              <div class="text-default-500 text-sm">Current Site Logo</div>
            </div>
          </div>
          <div class="grid w-full gap-2 pb-4">
            <UFormField label="Site Favicon" class="w-full">
              <UFileUpload
                v-model="faviconFile"
                name="site_favicon"
                color="neutral"
                icon="i-heroicons-photo"
                label="Drop your image here"
                description="SVG, PNG, JPG or GIF (max. 2MB)"
                accept="image/*"
                position="inside"
                layout="list"
                class="min-h-32 w-full cursor-pointer"
                @update:model-value="
                  (file) => handleFileUpload('site_favicon', file)
                "
              />
            </UFormField>
            <div
              v-if="site_favicon"
              class="bg-default my-2 flex w-full items-center gap-3 rounded-lg p-2"
            >
              <img
                :src="site_favicon"
                alt="Site Favicon Preview"
                class="h-8 w-8 rounded-md"
              />
              <div class="text-default-500 text-sm">Current Site Favicon</div>
            </div>
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
        </form>
      </UPageCard>
    </UPageCard>
  </AppSettingLayout>
</template>

<style scoped></style>

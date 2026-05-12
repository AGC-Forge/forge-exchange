<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Profile",
  description: "Manage your account profile.",
  robots: "noindex, nofollow",
});

const { user, fetch } = useUserSession();
const { updateAvatar, updateProfile } = useProfile();
const {
  subscription,
  packages,
  plans,
  creditLogs,
  logMeta,
  transactions,
  txMeta,
  isLoading,
  isTopingUp,
  fetchSubscription,
  fetchCreditLogs,
  fetchTransactions,
  createTopUp,
} = useBilling();

const toast = useToast();

const avatarFile = ref<File | null>(null);
const creditBalance = computed(
  () => user.value?.subscription?.creditBalance ?? 0,
);
const plan = computed(() =>
  plans.value.find((p) => p.name === user.value?.subscription?.plan),
);

const { handleSubmit, errors, isSubmitting, setValues } = useForm({
  validationSchema: UpdateProfileSchema,
  initialValues: {
    name: "",
    avatar: "",
  },
});
onMounted(() => {
  watch(
    user,
    (value) => {
      if (!value) return;
      setValues({
        name: value.name || "",
        avatar: value.avatarUrl || "/images/no-avatar.jpg",
      });
    },
    { immediate: true },
  );
});

const { value: name } = useField<string>("name");
const { value: avatar } = useField<string>("avatar");

const submit = handleSubmit(async (value) => {
  try {
    await updateProfile(value);
    await fetch();
  } catch (error) {
    toast.add({
      title: "Error",
      description: error instanceof Error ? error.message : "Update failed",
      color: "error",
      icon: "ph:x-circle-bold",
    });
  }
});
const handleFileUpload = async (file?: File | null) => {
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
    await handleUpload(file);
  }
};
async function handleUpload(file?: File | null) {
  if (!file) return;

  if (avatar.value.trim() !== "" && !avatar.value.includes("cloudinary.com")) {
    await deleteImage(avatar.value);
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

    avatar.value = uploadedUrl;

    const saveRes = await updateAvatar(uploadedUrl);
    if (!saveRes) {
      throw new Error(saveRes || "Upload success but failed to save avatar");
    }

    await fetch();

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
  <AppAccountLayout>
    <UPageCard
      title="Profile"
      description="Update your profile."
      variant="naked"
      class="mb-4"
    >
      <UPricingPlan
        :title="user?.subscription?.plan || 'Free'"
        description="For bootstrappers and indie hackers."
        :price="creditBalance.toLocaleString()"
        :features="[...(plan?.features || [])]"
        :button="{
          label: 'Buy Credit',
        }"
        orientation="horizontal"
        tagline="Credit Remaining"
        terms="Invoices and receipts available."
        :ui="{
          title: 'uppercase',
          button:
            'bg-primary text-white font-semibold hover:bg-primary-600 hover:text-white active:bg-primary-600 active:text-white focus:bg-primary-600 focus:text-white',
        }"
      />
      <UPageCard
        variant="subtle"
        :ui="{ container: 'divide-y divide-default' }"
      >
        <form class="w-full space-y-4" @submit.prevent="submit">
          <div class="grid w-full gap-2 pb-4">
            <UFormField
              label="Name"
              required
              class="w-full"
              :error="errors.name"
            >
              <UInput
                v-model="name"
                name="name"
                placeholder="Enter your name"
                class="w-full"
                variant="outline"
                icon="material-symbols:person"
                autocomplete="name"
              />
            </UFormField>
          </div>
          <div class="grid w-full gap-2 pb-4">
            <UFormField label="Avatar" class="w-full">
              <UFileUpload
                v-model="avatarFile"
                name="avatar"
                color="neutral"
                icon="i-heroicons-photo"
                label="Drop your image here"
                description="SVG, PNG, JPG or GIF (max. 2MB)"
                accept="image/*"
                position="inside"
                layout="list"
                class="min-h-32 w-full cursor-pointer"
                @update:model-value="(file) => handleFileUpload(file)"
              />
            </UFormField>
            <div
              v-if="avatar"
              class="bg-default my-2 flex w-full items-center gap-3 rounded-lg p-2"
            >
              <img
                :src="avatar"
                alt="Avatar Preview"
                class="h-8 w-8 rounded-md"
              />
              <div class="text-default-500 text-sm">Current Avatar</div>
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
            {{ isSubmitting ? "Updating..." : "Update Profile" }}
          </UButton>
        </form>
      </UPageCard>
    </UPageCard>
  </AppAccountLayout>
</template>

<style scoped></style>

<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: "auth",
});
useSeoMeta({
  title: "Security",
  description: "Manage your account security.",
  robots: "noindex, nofollow",
});

const { updatePassword, deleteAccount } = useProfile();
const { clear } = useUserSession();
const toast = useToast();

const passwordInput = ref<"password" | "text">("password");
const newPasswordInput = ref<"password" | "text">("password");
const confirmPasswordInput = ref<"password" | "text">("password");
const deleteAccountOpen = ref<boolean>(false);

const { handleSubmit, errors, isSubmitting, validateField } = useForm({
  validationSchema: ChangePasswordSchema,
  initialValues: {
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  },
});

const { value: currentPassword } = useField<string>("currentPassword");
const { value: newPassword } = useField<string>("newPassword");
const { value: confirmNewPassword } = useField<string>("confirmNewPassword");

const passwordStrength = computed(() => {
  const password = newPassword.value;
  if (!password) return { level: 0, text: "", color: "neutral" };

  let strength = 0;

  // Length
  if (password.length >= 6) strength++;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;

  // Complexity
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  if (strength <= 2) {
    return { level: 1, text: "Password is too weak", color: "red" };
  } else if (strength <= 4) {
    return { level: 2, text: "Password is medium", color: "yellow" };
  } else if (strength <= 6) {
    return { level: 3, text: "Password is strong", color: "green" };
  } else {
    return { level: 4, text: "Password is very strong", color: "green" };
  }
});

const submit = handleSubmit(async (value) => {
  try {
    await updatePassword(value);

    setTimeout(async () => {
      await clear();
      await navigateTo("/login");
    }, 1000);
  } catch (error) {
    toast.add({
      title: "Error",
      description: error instanceof Error ? error.message : "Update failed",
      color: "error",
      icon: "ph:x-circle-bold",
    });
  }
});
const handleDeleteAccount = async () => {
  try {
    await deleteAccount();
  } catch (error) {
    toast.add({
      title: "Error",
      description: error instanceof Error ? error.message : "Delete failed",
      color: "error",
      icon: "ph:x-circle-bold",
    });
  }
};
</script>

<template>
  <AppAccountLayout>
    <UPageCard
      title="Security"
      description="Update your security."
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
              :label="
                passwordInput === 'password'
                  ? 'Current Password'
                  : 'Show Password'
              "
              required
              class="w-full"
              :error="errors.currentPassword"
            >
              <UInput
                v-model="currentPassword"
                :type="passwordInput"
                name="currentPassword"
                placeholder="Enter your password"
                class="w-full"
                variant="outline"
                :icon="
                  passwordInput === 'password'
                    ? 'material-symbols:lock'
                    : 'material-symbols:visibility'
                "
                autocomplete="current-password"
                :loading="isSubmitting"
                loading-icon="i-lucide-loader"
                :disabled="isSubmitting"
                color="neutral"
                :ui="{ trailing: 'pe-1' }"
                @blur="validateField('currentPassword')"
              >
                <template #trailing>
                  <UButton
                    variant="link"
                    color="neutral"
                    class="w-full text-sm"
                    @click="
                      passwordInput =
                        passwordInput === 'password' ? 'text' : 'password'
                    "
                  >
                    {{ passwordInput === "password" ? "Show" : "Hide" }}
                  </UButton>
                </template>
              </UInput>
            </UFormField>
          </div>
          <div class="grid w-full gap-2 pb-4">
            <UFormField
              :label="
                newPasswordInput === 'password'
                  ? 'New Password'
                  : 'Show Password'
              "
              required
              class="w-full"
              :error="errors.newPassword"
            >
              <UInput
                v-model="newPassword"
                :type="newPasswordInput"
                name="newPassword"
                placeholder="Enter your new password"
                class="w-full"
                variant="outline"
                :icon="
                  newPasswordInput === 'password'
                    ? 'material-symbols:lock'
                    : 'material-symbols:visibility'
                "
                autocomplete="new-password"
                :loading="isSubmitting"
                loading-icon="i-lucide-loader"
                :disabled="isSubmitting"
                color="neutral"
                :ui="{ trailing: 'pe-1' }"
                @blur="validateField('newPassword')"
              >
                <template #trailing>
                  <UButton
                    variant="link"
                    color="neutral"
                    class="w-full text-sm"
                    @click="
                      newPasswordInput =
                        newPasswordInput === 'password' ? 'text' : 'password'
                    "
                  >
                    {{ newPasswordInput === "password" ? "Show" : "Hide" }}
                  </UButton>
                </template>
              </UInput>
              <template v-if="newPassword" #hint>
                <div class="mt-2 flex items-center gap-2">
                  <div
                    class="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
                  >
                    <div
                      class="h-full transition-all duration-300"
                      :class="{
                        'bg-red-500': passwordStrength.level === 1,
                        'bg-yellow-500': passwordStrength.level === 2,
                        'bg-green-500': passwordStrength.level >= 3,
                      }"
                      :style="{
                        width: `${(passwordStrength.level / 4) * 100}%`,
                      }"
                    />
                  </div>
                  <span
                    class="text-xs font-medium"
                    :class="{
                      'text-red-500': passwordStrength.level === 1,
                      'text-yellow-500': passwordStrength.level === 2,
                      'text-green-500': passwordStrength.level >= 3,
                    }"
                  >
                    {{ passwordStrength.text }}
                  </span>
                </div>
              </template>
            </UFormField>
          </div>
          <div class="grid w-full gap-2 pb-4">
            <UFormField
              :label="
                confirmPasswordInput === 'password'
                  ? 'Confirm New Password'
                  : 'Show Password'
              "
              required
              class="w-full"
              :error="errors.confirmNewPassword"
            >
              <UInput
                v-model="confirmNewPassword"
                :type="confirmPasswordInput"
                name="confirmNewPassword"
                placeholder="Confirm your new password"
                class="w-full"
                variant="outline"
                :icon="
                  confirmPasswordInput === 'password'
                    ? 'material-symbols:lock'
                    : 'material-symbols:visibility'
                "
                autocomplete="new-password"
                :loading="isSubmitting"
                loading-icon="i-lucide-loader"
                :disabled="isSubmitting"
                color="neutral"
                :ui="{ trailing: 'pe-1' }"
                @blur="validateField('confirmNewPassword')"
              >
                <template #trailing>
                  <UButton
                    variant="link"
                    color="neutral"
                    class="w-full text-sm"
                    @click="
                      confirmPasswordInput =
                        confirmPasswordInput === 'password'
                          ? 'text'
                          : 'password'
                    "
                  >
                    {{ confirmPasswordInput === "password" ? "Show" : "Hide" }}
                  </UButton>
                </template>
              </UInput>
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
            {{ isSubmitting ? "Updating..." : "Update Password" }}
          </UButton>
        </form>
      </UPageCard>
      <UPageCard
        title="Account"
        description="No longer want to use our service? You can delete your account here. This action is not reversible. All information related to this account will be deleted permanently."
        class="from-error/10 to-default bg-linear-to-tl from-5%"
      >
        <template #footer>
          <UButton
            label="Delete account"
            color="error"
            class="text-white"
            @click="deleteAccountOpen = true"
          />
        </template>
      </UPageCard>
    </UPageCard>
    <AlertDialog
      :open="deleteAccountOpen"
      type="error"
      title="Delete Account"
      message="Are you sure you want to delete your account? This action is not reversible. All information related to this account will be deleted permanently."
      is-action
      label-action="Delete account"
      label-close="Cancel"
      @onaction="handleDeleteAccount"
      @onclose="deleteAccountOpen = false"
    />
  </AppAccountLayout>
</template>

<style scoped></style>

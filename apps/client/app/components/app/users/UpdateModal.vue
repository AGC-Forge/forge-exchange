<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { User, Subscription, Campaign, Role } from "@forge-exchange/db";

interface UserWithRoles extends User {
  subscription: Subscription;
  role: Role;
  campaigns: Campaign[];
}

const emits = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "onSuccess"): void;
}>();

const props = withDefaults(
  defineProps<{
    open: boolean;
    user?: UserWithRoles | null;
  }>(),
  {
    open: false,
    user: null,
  },
);

const { isLoading, updateUser } = useAdmin();
const toast = useToast();

const modalValue = useVModel(props, "open", emits, {
  defaultValue: false,
});

const state = reactive<UpdateUserInput>({
  name: props.user?.name || "",
  email: props.user?.email || "",
  plan: props.user?.subscription.plan || "free",
  creditLimit: Number(props.user?.subscription.creditLimit || 0),
  creditBalance: Number(props.user?.subscription.creditBalance || 0),
  expiredAt:
    props.user?.subscription.expiredAt || getDynamicDates().oneMonthFromNow,
  isActive: props.user?.subscription.isActive || true,
  emailVerified: props.user?.emailVerified || false,
  isActiveSubscription: props.user?.subscription.isActive || true,
});

// DatePickerInput expects string (ISO), schema accepts Date | ISO string
const expiredAtString = ref(getDynamicDates().oneMonthFromNow.toISOString());
watch(expiredAtString, (val) => {
  state.expiredAt = new Date(val);
});

type Schema = z.output<typeof updateUserSchema>;

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  if (!props.user) {
    toast.add({
      title: "User not found",
      description: "User not found",
      color: "error",
      icon: "material-symbols:x-circle-outline",
    });
    return;
  }
  try {
    await updateUser(props.user.id, state);
    emits("onSuccess");
  } catch (err) {
    console.error(err);
  } finally {
    modalValue.value = false;
    isLoading.value = false;
  }
};

const planOptions = [
  {
    label: "Free",
    value: "free",
  },
  {
    label: "Starter",
    value: "starter",
  },
  {
    label: "Pro",
    value: "pro",
  },
  {
    label: "Enterprise",
    value: "enterprise",
  },
];
</script>

<template>
  <UModal
    v-model:open="modalValue"
    :close="{
      color: 'error',
      variant: 'outline',
      class: 'rounded-full text-error',
    }"
    scrollable
  >
    <template #content>
      <div class="p-6 space-y-5">
        <div>
          <h3 class="font-semibold text-lg">
            Update User {{ props.user?.name }}
          </h3>
          <p class="text-sm text-muted mt-0.5">Update a user information.</p>
        </div>
        <UForm
          :schema="updateUserSchema"
          :state="state"
          class="p-6 space-y-5 w-full"
          @submit="onSubmit"
        >
          <UFormField label="Name" name="name">
            <UInput
              v-model="state.name"
              type="text"
              name="name"
              placeholder="Enter name"
              autocomplete="name"
              icon="material-symbols:text-fields"
              class="w-full"
              :disabled="isLoading"
            />
          </UFormField>
          <UFormField label="Email" name="email">
            <UInput
              v-model="state.email as string"
              type="text"
              name="email"
              placeholder="Enter email"
              autocomplete="email"
              icon="material-symbols:mail"
              class="w-full"
              :disabled="isLoading"
            />
          </UFormField>
          <UFormField label="Plan" name="plan">
            <USelect
              v-model="state.plan as 'free' | 'starter' | 'pro' | 'enterprise'"
              name="plan"
              placeholder="Select plan"
              icon="material-symbols-light:event-list-sharp"
              :items="planOptions"
              class="w-full"
              :disabled="isLoading"
            />
          </UFormField>
          <UFormField label="Credit Limit" name="creditLimit">
            <UInput
              v-model="state.creditLimit as number"
              type="number"
              name="creditLimit"
              placeholder="Enter credit limit"
              autocomplete="on"
              icon="material-symbols:money"
              class="w-full"
              :disabled="isLoading"
            />
          </UFormField>
          <UFormField label="Credit Balance" name="creditBalance">
            <UInput
              v-model="state.creditBalance as number"
              type="number"
              name="creditBalance"
              placeholder="Enter credit balance"
              autocomplete="on"
              icon="material-symbols:money"
              class="w-full"
              :disabled="isLoading"
            />
          </UFormField>
          <UFormField label="Credit Used" name="creditUsed">
            <UInput
              v-model="state.creditUsed as number"
              type="number"
              name="creditUsed"
              placeholder="Enter credit used"
              autocomplete="on"
              icon="material-symbols:money"
              class="w-full"
              :disabled="isLoading"
            />
          </UFormField>
          <UFormField label="Active" name="isActive">
            <USwitch
              v-model="state.isActive"
              label="Status Active"
              description="Determine the Active Status of the User Account"
              unchecked-icon="i-lucide-x"
              checked-icon="i-lucide-check"
              :disabled="isLoading"
            />
          </UFormField>
          <UFormField label="Active Subscription" name="isActiveSubscription">
            <USwitch
              v-model="state.isActiveSubscription"
              label="Status Active Subscription"
              description="Determine the Active Subscription Status of the User Subscription"
              unchecked-icon="i-lucide-x"
              checked-icon="i-lucide-check"
              :disabled="isLoading"
            />
          </UFormField>
          <UFormField label="Email Verified" name="emailVerified">
            <USwitch
              v-model="state.emailVerified"
              label="Status Email Verified"
              description="Determine the Email Verification Status of the User Account"
              unchecked-icon="i-lucide-x"
              checked-icon="i-lucide-check"
              :disabled="isLoading"
            />
          </UFormField>
          <DatePickerInput
            v-model:value="expiredAtString"
            name="expiredAt"
            label="Expired At"
            placeholder="Select expired at"
            :disabled="isLoading"
          />
          <div class="flex items-center justify-end gap-2">
            <UButton
              type="button"
              label="Close"
              color="neutral"
              variant="outline"
              icon="material-symbols:close"
              size="md"
              :disabled="isLoading"
              @click="modalValue = false"
            />

            <UButton
              type="submit"
              color="primary"
              icon="material-symbols:save"
              size="md"
              class="text-white"
              :disabled="isLoading"
              :loading="isLoading"
            >
              {{ isLoading ? "Updating..." : "Update" }}
            </UButton>
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>

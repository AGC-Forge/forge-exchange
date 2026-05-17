<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const emits = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "onSuccess"): void;
}>();
const props = withDefaults(
  defineProps<{
    open: boolean;
  }>(),
  {
    open: false,
  },
);

const { isLoading, inviteUser } = useAdmin();

const modalValue = useVModel(props, "open", emits, {
  defaultValue: false,
});

const state = reactive<InviteUserInput>({
  name: "",
  email: "",
  password: "",
  plan: "free",
  creditLimit: 0,
  creditBalance: 0,
  expiredAt: getDynamicDates().oneMonthFromNow,
  isActive: true,
  emailVerified: false,
});
const showPassword = ref(false);

// DatePickerInput expects string (ISO), schema accepts Date | ISO string
const expiredAtString = ref(getDynamicDates().oneMonthFromNow.toISOString());
watch(expiredAtString, (val) => {
  state.expiredAt = new Date(val);
});

type Schema = z.output<typeof inviteUserSchema>;

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  try {
    const ok = await inviteUser(event.data);
    if (ok) emits("onSuccess");
  } catch (err) {
    console.error(err);
  } finally {
    modalValue.value = false;
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
          <h3 class="font-semibold text-lg">Invite User</h3>
          <p class="text-sm text-muted mt-0.5">
            Invite a user to join your exchange.
          </p>
        </div>
        <UForm
          :schema="inviteUserSchema"
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
              v-model="state.email"
              type="email"
              name="email"
              placeholder="Enter email"
              autocomplete="email"
              icon="material-symbols:mail"
              class="w-full"
              :disabled="isLoading"
            />
          </UFormField>
          <UFormField label="Password" name="password">
            <UInput
              v-model="state.password"
              :type="showPassword ? 'text' : 'password'"
              name="password"
              placeholder="Enter password"
              autocomplete="new-password"
              icon="material-symbols:lock"
              class="w-full"
              :disabled="isLoading"
            >
              <template #trailing>
                <UButton
                  type="button"
                  color="neutral"
                  variant="link"
                  size="sm"
                  :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  :aria-pressed="showPassword"
                  aria-controls="password"
                  @click.prevent="showPassword = !showPassword"
                />
              </template>
            </UInput>
          </UFormField>
          <UFormField label="Plan" name="plan">
            <USelect
              v-model="state.plan"
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
              v-model.number="state.creditLimit"
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
              v-model.number="state.creditBalance"
              type="number"
              name="creditBalance"
              placeholder="Enter credit balance"
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
              icon="material-symbols:add"
              size="md"
              class="text-white"
              :disabled="isLoading"
              :loading="isLoading"
            >
              {{ isLoading ? "Inviting..." : "Invite" }}
            </UButton>
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>

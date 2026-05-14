<script setup lang="ts">
import type { SelectItem } from "@nuxt/ui";
import type {
  User,
  Subscription,
  Campaign,
  Role,
  UserRole,
} from "@forge-exchange/db";

definePageMeta({
  layout: "auth",
  middleware: "admin",
});
useSeoMeta({
  title: "Users",
  description: "Welcome to your users page. Here you can manage your users.",
  robots: "noindex, nofollow",
});

interface UserWithRoles extends User {
  subscription: Subscription;
  role: Role;
  campaigns: Campaign[];
}

const {
  users,
  meta,
  isLoading,
  fetchUsers,
  deleteUser,
  assignRole,
  setActiveStatus,
  bulkDeleteUsers,
  cleanUpUsers,
} = useAdmin();
const toast = useToast();

const search = ref("");
const filterStatus = ref("all");
const filterRole = ref("all");
const orderBy = ref("createdAt");
const currentPage = ref(1);
const showDeleteModal = ref(false);
const showInviteModal = ref(false);
const showUpdateModal = ref(false);
const showCleanUpModal = ref(false);
const deletingUser = ref<UserWithRoles | null>(null);
const userToEdit = ref<UserWithRoles | null>(null);
const selectedUsers = ref<UserWithRoles[]>([]);

const statusOptions: SelectItem[] = [
  { label: "All Status", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];
const roleOptions: SelectItem[] = [
  { label: "All Role", value: "all" },
  { label: "Super Admin", value: "superadmin" },
  { label: "Admin", value: "admin" },
  { label: "Moderator", value: "moderator" },
  { label: "User", value: "user" },
];
const orderOptions: SelectItem[] = [
  { label: "ID", value: "id" },
  { label: "Latest", value: "createdAt" },
  { label: "Name", value: "name" },
  { label: "Email", value: "email" },
  { label: "Updated", value: "updatedAt" },
];
const hasActiveFilters = computed(() => {
  return (
    search.value !== "" ||
    filterStatus.value !== "all" ||
    filterRole.value !== "all" ||
    orderBy.value !== "createdAt"
  );
});
const stats = computed(() => {
  const all = users.value;
  const active = all.filter((c) => c.subscription.isActive).length;
  const expired = all.filter((c) => !c.subscription.isActive).length;
  return [
    {
      label: "Total Users",
      value: active,
      color: "indigo",
      icon: "ph:users-three-fill",
    },
    {
      label: "Active Subscriptions",
      value: active,
      color: "emerald",
      icon: "material-symbols:check-circle",
    },
    {
      label: "Expired Subscriptions",
      value: expired,
      color: "amber",
      icon: "material-symbols:warning-rounded",
    },
  ];
});

const visiblePages = computed(() => {
  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2));
  const end = Math.min(meta.value.totalPages, start + maxVisible - 1);

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return pages;
});

watch(
  () => currentPage.value,
  (newVal) => {
    debouncedFetch();
  },
);
function buildParams() {
  return {
    page: currentPage.value,
    limit: 20,
    search: search.value || undefined,
    status: filterStatus.value !== "all" ? filterStatus.value : undefined,
    orderBy: orderBy.value,
    order: "desc",
    role: filterRole.value !== "all" ? filterRole.value : undefined,
  };
}

const debouncedFetch = useDebounceFn(() => {
  currentPage.value = 1;
  const params = buildParams();
  fetchUsers({
    ...params,
    status: params.status as "active" | "inactive" | undefined,
    role: params.role as
      | "superadmin"
      | "admin"
      | "moderator"
      | "user"
      | undefined,
  });
}, 400);

function onFilterChange() {
  currentPage.value = 1;
  debouncedFetch();
}
function onPageChange(page: number) {
  currentPage.value = page;
  debouncedFetch();
}
function confirmDelete(user: UserWithRoles) {
  deletingUser.value = user;
  showDeleteModal.value = true;
}

async function executeDelete() {
  if (!deletingUser.value) return;
  const ok = await deleteUser(deletingUser.value.id);
  if (ok) {
    showDeleteModal.value = false;
    debouncedFetch();
  }
}
async function onChangeStatus(user: UserWithRoles, status: StatusActive) {
  const ok = await setActiveStatus(user.id, {
    status,
  });
  if (ok) {
    debouncedFetch();
  }
}

async function onRoleChange(user: UserWithRoles, role: UserRole) {
  const ok = await assignRole(user.id, {
    role,
  });
  if (ok) {
    debouncedFetch();
  }
}

async function onBulkDelete() {
  const filteredUsers = users.value.filter((user) => user.role.name === "user");
  if (filteredUsers.length === 0) {
    toast.add({
      title: "No users selected",
      description: "Please select users to delete",
      color: "error",
      icon: "material-symbols:x-circle-outline",
    });
    return;
  }
  const ok = await bulkDeleteUsers({
    userIds: filteredUsers.map((user) => user.id),
  });
  if (ok) {
    debouncedFetch();
    selectedUsers.value = [];
  }
}

async function onCleanUp() {
  const ok = await cleanUpUsers();
  if (ok) {
    showCleanUpModal.value = false;
    debouncedFetch();
  }
}

onMounted(() => debouncedFetch());

const clearFilters = async () => {
  search.value = "";
  filterStatus.value = "all";
  filterRole.value = "all";
  orderBy.value = "createdAt";
  currentPage.value = 1;
  await debouncedFetch();
};
</script>

<template>
  <AppDashboardLayout id="users" title="Users Management">
    <template #content>
      <div class="min-h-screen p-6">
        <div class="mx-auto max-w-7xl space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-neutral-100 tracking-tight">
                Users
              </h1>
              <p class="text-sm text-neutral-500 mt-0.5">
                Manage all your users
              </p>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                color="error"
                icon="i-heroicons-trash"
                size="md"
                class="text-white"
                @click="showCleanUpModal = true"
              >
                Clean Up
              </UButton>
              <UButton
                color="primary"
                icon="i-heroicons-plus"
                size="md"
                class="text-white"
                @click="showInviteModal = true"
              >
                Invite User
              </UButton>
            </div>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <AppDashboardStatsCard
              v-for="stat in stats"
              :key="stat.label"
              :label="stat.label"
              :value="stat.value"
              :icon="stat.icon"
              :color="stat.color as ColorVariant"
              format="compact"
              :loading="isLoading"
            />
          </div>
          <UPageCard
            spotlight
            spotlight-color="info"
            title="Filter & Search"
            description="Filter campaign by status and type"
            :ui="{
              container:
                'shadow-md border border-info/20 dark:border-info/35 rounded-lg',
            }"
            class="mb-6 w-full shadow-sm"
          >
            <div class="flex flex-col sm:flex-row gap-3">
              <UInput
                v-model="search"
                icon="i-heroicons-magnifying-glass"
                placeholder="Search campaign..."
                class="flex-1"
                @input="debouncedFetch"
              />
              <USelect
                v-model="filterStatus"
                :items="statusOptions"
                placeholder="All status"
                class="w-full sm:w-48"
                @change="onFilterChange"
              />
              <USelect
                v-model="filterRole"
                :items="roleOptions"
                placeholder="All role"
                class="w-full sm:w-48"
                @change="onFilterChange"
              />
              <USelect
                v-model="orderBy"
                :items="orderOptions"
                class="w-full sm:w-48"
                @change="onFilterChange"
              />
            </div>
            <div class="mt-4 flex items-center justify-between">
              <p class="text-muted text-sm">
                Showing {{ users?.length }} of {{ meta.total }} users
              </p>
              <UButton
                v-if="hasActiveFilters"
                variant="solid"
                color="error"
                size="sm"
                class="text-white"
                @click="clearFilters()"
              >
                Reset Filter
              </UButton>
            </div>
          </UPageCard>
          <!-- Loading -->
          <div v-if="isLoading" class="flex justify-center py-16">
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-8 h-8 text-indigo-400 animate-spin"
            />
          </div>
          <!-- Empty state -->
          <div
            v-else-if="users.length === 0"
            class="text-center py-16 border border-muted"
          >
            <UIcon
              name="i-heroicons-megaphone"
              class="w-12 h-12 text-neutral-600 mx-auto mb-4"
            />
            <h3 class="text-neutral-300 font-medium mb-1">No users found</h3>
            <p class="text-neutral-500 text-sm mb-4">
              Invite a user to boost traffic
            </p>
            <UButton
              color="primary"
              size="md"
              icon="i-heroicons-plus"
              class="text-white"
              @click="showInviteModal = true"
            >
              Invite User
            </UButton>
          </div>

          <div v-else class="space-y-3">
            <AppUsersTable
              :users="users"
              :loading="isLoading"
              :totalPages="meta.totalPages"
              :currentPage="currentPage"
              :perPage="meta.limit"
              :visiblePages="visiblePages"
              @delete="(val) => confirmDelete(val)"
              @change-status="(user, status) => onChangeStatus(user, status)"
              @change-role="(user, role) => onRoleChange(user, role)"
              @prev="() => currentPage--"
              @next="() => currentPage++"
              @go-to-current-page="(val) => (currentPage = val)"
              @edit-user="
                (val) => {
                  userToEdit = val;
                  showUpdateModal = true;
                }
              "
              @delete-modal-submit="onBulkDelete"
            />
          </div>
        </div>

        <AppUsersInviteModal
          v-model:open="showInviteModal"
          @update:open="(val) => (showInviteModal = val)"
          @onSuccess="debouncedFetch"
        />
        <AppUsersUpdateModal
          v-if="userToEdit"
          v-model:open="showUpdateModal"
          :user="userToEdit"
          @update:open="(val) => (showUpdateModal = val)"
          @onSuccess="debouncedFetch"
        />
        <AlertDialog
          :open="showDeleteModal"
          type="warning"
          title="Delete User"
          message="Are you sure you want to delete this user? This action is not reversible. All information related to this user will be deleted permanently."
          is-action
          label-action="Delete user"
          label-close="Cancel"
          @onaction="executeDelete"
          @onclose="showDeleteModal = false"
        />
        <AlertDialog
          :open="showCleanUpModal"
          type="warning"
          title="Clean Up User"
          message="Are you sure you want to clean up users data? This action is not reversible. All information related to this user will be deleted permanently."
          is-action
          label-action="Clean up"
          label-close="Cancel"
          @onaction="onCleanUp"
          @onclose="showCleanUpModal = false"
        />
      </div>
    </template>
  </AppDashboardLayout>
</template>

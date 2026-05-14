import type { User, Subscription, Campaign, Role } from "@forge-exchange/db"

interface UserWithRoles extends User {
  subscription: Subscription
  role: Role
  campaigns: Campaign[]
}

export const useAdmin = () => {
  const users = ref<UserWithRoles[]>([]);
  const user = ref<UserWithRoles | null>(null);
  const isLoading = ref(false);
  const meta = ref({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const error = ref<string | null>(null);
  const toast = useToast();

  async function fetchUsers(params?: {
    page?: number;
    limit?: number;
    status?: StatusActive;
    search?: string;
    orderBy?: string;
    order?: string;
    role?: UserRole
  }) {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetch("/api/user", { query: params });
      if (!res.success) {
        users.value = [];
        meta.value = { total: 0, page: 1, limit: 20, totalPages: 1 };
        return;
      }

      users.value = res.data as unknown as UserWithRoles[];
      meta.value = res.meta;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Fail to fetch users";
    } finally {
      isLoading.value = false;
    }
  }
  async function getUser(userId: string) {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetch<ApiResponse<UserWithRoles>>(`/api/user/${userId}`);
      if (!res.success) {
        user.value = null;
        return;
      }

      user.value = res.data as unknown as UserWithRoles;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Fail to fetch user";
    } finally {
      isLoading.value = false;
    }
  }
  async function inviteUser(data: InviteUserInput) {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetch("/api/user", {
        method: "POST",
        body: data,
      });
      if (!res.success) {
        throw new Error(res?.message ?? "Fail to invite user");
      }
      toast.add({
        title: "User invited successfully",
        description: res.message ?? "User invited successfully",
        color: "success",
        icon: "material-symbols:check-circle-outline",
      });
      return true;
    } catch (err: any) {
      toast.add({
        title: "Failed to invite user",
        description: err instanceof Error ? err.message : "Try again",
        color: "error",
        icon: "material-symbols:x-circle-outline",
      });
      return false;
    } finally {
      isLoading.value = false;
    }
  }
  async function assignRole(id: string, data: AssignRoleInput) {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetch(`/api/user/${id}/role-assign`, {
        method: "PATCH",
        body: data,
      });
      if (!res.success) {
        throw new Error(res?.message ?? "Fail to assign role");
      }
      toast.add({
        title: "Role assigned successfully",
        description: res.message ?? "Role assigned successfully",
        color: "success",
        icon: "material-symbols:check-circle-outline",
      });

      return true;
    } catch (err: any) {
      toast.add({
        title: "Failed to assign role",
        description: err instanceof Error ? err.message : "Try again",
        color: "error",
        icon: "material-symbols:x-circle-outline",
      });
      return false;
    } finally {
      isLoading.value = false;
    }
  }
  async function setActiveStatus(id: string, data: SetActiveInput) {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetch(`/api/user/${id}/status`, {
        method: "PATCH",
        body: data,
      });
      if (!res.success) {
        throw new Error(res?.message ?? "Fail to set active status");
      }
      toast.add({
        title: "Active status set successfully",
        description: res.message ?? "Active status set successfully",
        color: "success",
        icon: "material-symbols:check-circle-outline",
      });
      return true;
    } catch (err: any) {
      toast.add({
        title: "Failed to set active status",
        description: err instanceof Error ? err.message : "Try again",
        color: "error",
        icon: "material-symbols:x-circle-outline",
      });
      return false;
    } finally {
      isLoading.value = false;
    }
  }
  async function deleteUser(id: string) {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetch<ApiResponse>(`/api/user/${id}`, {
        method: "DELETE",
      });
      if (!res.success) {
        throw new Error(res?.message ?? "Fail to delete user");
      }
      toast.add({
        title: "User deleted successfully",
        description: res.message ?? "User deleted successfully",
        color: "success",
        icon: "material-symbols:check-circle-outline",
      });

      return true;
    } catch (err) {
      toast.add({
        title: "Failed to delete user",
        description: err instanceof Error ? err.message : "Try again",
        color: "error",
        icon: "material-symbols:x-circle-outline",
      });
      return false;
    } finally {
      isLoading.value = false;
    }
  }
  async function updateUser(id: string, data: UpdateUserInput) {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetch<ApiResponse<User>>(`/api/user/${id}`, {
        method: "PATCH",
        body: data,
      });
      if (!res.success) {
        throw new Error(res?.message ?? "Fail to update user");
      }
      toast.add({
        title: "User updated successfully",
        description: res.message ?? "User updated successfully",
        color: "success",
        icon: "material-symbols:check-circle-outline",
      });
      return true;
    } catch (err) {
      toast.add({
        title: "Failed to update user",
        description: err instanceof Error ? err.message : "Try again",
        color: "error",
        icon: "material-symbols:x-circle-outline",
      });
      return false;
    } finally {
      isLoading.value = false;
    }
  }
  async function bulkDeleteUsers(data: { userIds: string[] }) {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetch(`/api/user/bulk`, {
        method: "DELETE",
        body: data,
      });
      if (!res.success) {
        throw new Error(res?.message ?? "Fail to bulk delete users");
      }
      toast.add({
        title: "Users deleted successfully",
        description: res.message ?? "Users deleted successfully",
        color: "success",
        icon: "material-symbols:check-circle-outline",
      });
      return true;
    } catch (err) {
      toast.add({
        title: "Failed to bulk delete users",
        description: err instanceof Error ? err.message : "Try again",
        color: "error",
        icon: "material-symbols:x-circle-outline",
      });
      return false;
    } finally {
      isLoading.value = false;
    }
  }
  async function cleanUpUsers() {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetch(`/api/user/clean-up`, {
        method: "POST",
      });
      if (!res.success) {
        throw new Error(res?.message ?? "Fail to clean up users");
      }
      toast.add({
        title: "Users cleaned up successfully",
        description: res.message ?? "Users cleaned up successfully",
        color: "success",
        icon: "material-symbols:check-circle-outline",
      });
      return true;
    } catch (err) {
      toast.add({
        title: "Failed to clean up users",
        description: err instanceof Error ? err.message : "Try again",
        color: "error",
        icon: "material-symbols:x-circle-outline",
      });
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    users,
    user,
    isLoading,
    meta,
    error,
    fetchUsers,
    getUser,
    inviteUser,
    assignRole,
    setActiveStatus,
    deleteUser,
    updateUser,
    bulkDeleteUsers,
    cleanUpUsers,
  }
}

import type { User, Role, Subscription } from "@forge-exchange/db";

interface UserSession extends Omit<User, 'role'> {
  role: Omit<Role, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
  };
  subscription?: (Omit<Subscription, 'creditBalance' | 'creditLimit' | 'creditUsed'> & {
    creditBalance: number;
    creditLimit: number;
    creditUsed: number;
  }) | null;
  creditBalance?: number;
  creditLimit?: number;
  creditUsed?: number;
}
export const useProfile = () => {
  const currentProfile = ref<UserSession | null>(null);
  const toast = useToast();

  const getCurrentProfile = async () => {
    try {

      const res = await $fetch("/api/user/me")
      if (!res.success) throw new Error(res.message || "Failed to get user profile.")

      // @ts-ignore
      currentProfile.value = res.data

    } catch (error) {
      return null
    }
  }

  const updateAvatar = async (avatar: string) => {
    try {
      const res = await $fetch<ApiResponse<{ avatarUrl: string | null; }>>("/api/user/avatar", {
        method: "PUT",
        body: {
          avatar,
        },
      })
      if (!res.success) {
        throw new Error(res.message || "Failed to update avatar.")
      }

      toast.add({
        title: "Avatar diupdate!",
        color: "success",
        icon: "i-heroicons-check-circle",
      });

      return res.data
    } catch (error) {
      toast.add({
        title: "Failed to update avatar!",
        color: "error",
        icon: "i-heroicons-x-circle",
      });
      return null
    }
  }

  const updateProfile = async (profile: UpdateProfileInput) => {
    try {
      const res = await $fetch<ApiResponse<{ message: string }>>("/api/user/profile", {
        method: "PUT",
        body: profile,
      })
      if (!res.success) {
        throw new Error(res.message || "Failed to update profile.")
      }

      toast.add({
        title: "Profile diupdate!",
        color: "success",
        icon: "i-heroicons-check-circle",
      });

      return res.message
    } catch (error) {
      toast.add({
        title: "Failed to update profile!",
        color: "error",
        icon: "i-heroicons-x-circle",
      });
      return null
    }
  }

  const updatePassword = async (data: ChangePasswordInput) => {
    try {
      const res = await $fetch<ApiResponse<{ message: string }>>("/api/user/password", {
        method: "PUT",
        body: data,
      })
      if (!res.success) {
        throw new Error(res.message || "Failed to update password.")
      }

      toast.add({
        title: "Password diupdate!",
        color: "success",
        icon: "i-heroicons-check-circle",
      });

      return res.message
    } catch (error) {
      toast.add({
        title: "Failed to update password!",
        color: "error",
        icon: "i-heroicons-x-circle",
      });
      return null
    }
  }

  const deleteAccount = async () => {
    try {
      const res = await $fetch<ApiResponse<{ message: string }>>("/api/user/delete", {
        method: "DELETE",
      })
      if (!res.success) {
        throw new Error(res.message || "Failed to delete account.")
      }

      toast.add({
        title: "Account dihapus!",
        color: "success",
        icon: "i-heroicons-check-circle",
      });

      return res.message
    } catch (error) {
      toast.add({
        title: "Failed to delete account!",
        color: "error",
        icon: "i-heroicons-x-circle",
      });
      return null
    }
  }

  return {
    currentProfile,
    getCurrentProfile,
    updateAvatar,
    updateProfile,
    updatePassword,
    deleteAccount,
  }
}

import type { PublicSettings, SettingsGroupMap } from "#shared/types/settings";

const defaultPublicSettings: PublicSettings = {
  site_name: "Forge AI",
  site_description: "Forge AI",
  site_keywords: "Forge AI",
  site_icon: "/logo.png",
  site_logo: "/logo-small.png",
  site_favicon: "/favicon.ico",
  site_theme: "dark",
  is_maintenance: false,
  enable_register: true,
  enable_github_provider: true,
  enable_google_provider: true,
  max_upload_size_mb: 50,
  max_upload_image_mb: 10,
  max_upload_video_mb: 500,
  max_upload_audio_mb: 50,
  max_upload_document_mb: 20,
  max_upload_code_mb: 5,
  max_upload_archive_mb: 100,
  default_provider: null,
  default_model_id: null,
};

export function usePublicSettings() {
  return useFetch<PublicSettings>("/api/public/settings", {
    key: "public-settings",
    default: () => defaultPublicSettings,
  });
}

export function useSetting<K extends keyof PublicSettings>(key: K) {
  const { data, pending, error, refresh } = usePublicSettings();

  return {
    value: computed(() => data.value[key]),
    pending,
    error,
    refresh,
  };
}

export function useAdminSettingsMap() {
  return useFetch<{ groups: SettingsGroupMap }>("/api/settings/map", {
    key: "admin-settings-map",
  });
}

export function useAdminSetting(group_name: string, key: string) {
  const { data, pending, error, refresh } = useAdminSettingsMap();

  return {
    value: computed(() => data.value?.groups?.[group_name]?.[key]),
    pending,
    error,
    refresh,
  };
}

export async function updateSettings(
  updates:
    | {
        key: string;
        value: string | number | boolean | null;
        group_name?: string;
      }
    | {
        updates: {
          key: string;
          value: string | number | boolean | null;
          group_name?: string;
        }[];
      },
) {
  return await $fetch<{ ok: true }>("/api/settings", {
    method: "PUT",
    body: updates as any,
  });
}

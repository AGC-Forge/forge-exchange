import type { H3Event, H3Error } from "h3";
import type { Setting } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "./admin";

export const appSettingsSchema = z.object({
  site_name: z.string().min(1).max(100),
  site_description: z.string().max(500).optional().or(z.literal("")),
  site_keywords: z.string().max(255).optional().or(z.literal("")),
  site_icon: z.string().url().optional().or(z.literal("")),
  site_logo: z.string().url().optional().or(z.literal("")),
  site_favicon: z.string().url().optional().or(z.literal("")),
  site_theme: z.enum(["light", "dark", "system"]).default("dark"),
  is_maintenance: z.boolean(),
  enable_register: z.boolean(),
  enable_github_provider: z.boolean(),
  enable_google_provider: z.boolean(),
  max_upload_size_mb: z.number().int().positive(),
  max_upload_image_mb: z.number().int().positive(),
  max_upload_video_mb: z.number().int().positive(),
  max_upload_audio_mb: z.number().int().positive(),
  max_upload_document_mb: z.number().int().positive(),
  max_upload_code_mb: z.number().int().positive(),
  max_upload_archive_mb: z.number().int().positive(),
});
export type AppSettingsInput = z.infer<typeof appSettingsSchema>;

export const DEFAULTS_SETTINGS: SettingConfig = {
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
};

export const getSettings = async (): Promise<SettingRow[]> => {
  try {
    return (await prisma.setting.findMany({
      select: { key: true, value: true, updated_at: true },
    })) as SettingRow[];
  } catch (error) {
    console.error(`Failed to get app settings: ${error}`);
    return [];
  }
};
export const findByKey = async (
  key: string,
): Promise<Pick<Setting, "key" | "value"> | null> => {
  try {
    return await prisma.setting.findFirst({
      where: { key },
      orderBy: { updated_at: "desc" },
      select: { key: true, value: true },
    });
  } catch (error) {
    console.error(`Failed to get app setting: ${error}`);
    return null;
  }
};
export const updateByKey = async (
  key: string,
  value: string,
): Promise<void | H3Error> => {
  try {
    const res = await prisma.setting.updateMany({
      where: { key },
      data: { value },
    });
    if (res.count === 0) {
      await prisma.setting.create({
        data: { key, value, group_name: "default" },
      });
    }
  } catch (error) {
    console.error(`Failed to update setting: ${error}`);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update setting.",
    });
  }
};
export const getSetupConfig = async (): Promise<SettingConfig> => {
  const rows = await getSettings();
  const m = buildSettingMap(rows);
  return {
    site_name: getSetting(m, "site_name") ?? DEFAULTS_SETTINGS.site_name,
    site_description:
      getSetting(m, "site_description") ?? DEFAULTS_SETTINGS.site_description,
    site_keywords:
      getSetting(m, "site_keywords") ?? DEFAULTS_SETTINGS.site_keywords,
    site_icon: getSetting(m, "site_icon") ?? DEFAULTS_SETTINGS.site_icon,
    site_logo: getSetting(m, "site_logo") ?? DEFAULTS_SETTINGS.site_logo,
    site_favicon:
      getSetting(m, "site_favicon") ?? DEFAULTS_SETTINGS.site_favicon,
    site_theme: getSetting(m, "site_theme") ?? DEFAULTS_SETTINGS.site_theme,
    is_maintenance: parseBool(
      getSetting(m, "is_maintenance"),
      DEFAULTS_SETTINGS.is_maintenance,
    ),
    enable_register: parseBool(
      getSetting(m, "enable_register"),
      DEFAULTS_SETTINGS.enable_register,
    ),
    enable_github_provider: parseBool(
      getSetting(m, "enable_github_provider"),
      DEFAULTS_SETTINGS.enable_github_provider,
    ),
    enable_google_provider: parseBool(
      getSetting(m, "enable_google_provider"),
      DEFAULTS_SETTINGS.enable_google_provider,
    ),
    max_upload_size_mb: parseIntSafe(
      getSetting(m, "max_upload_size_mb"),
      DEFAULTS_SETTINGS.max_upload_size_mb,
    ),
    max_upload_image_mb: parseIntSafe(
      getSetting(m, "max_upload_image_mb"),
      DEFAULTS_SETTINGS.max_upload_image_mb,
    ),
    max_upload_video_mb: parseIntSafe(
      getSetting(m, "max_upload_video_mb"),
      DEFAULTS_SETTINGS.max_upload_video_mb,
    ),
    max_upload_audio_mb: parseIntSafe(
      getSetting(m, "max_upload_audio_mb"),
      DEFAULTS_SETTINGS.max_upload_audio_mb,
    ),
    max_upload_document_mb: parseIntSafe(
      getSetting(m, "max_upload_document_mb"),
      DEFAULTS_SETTINGS.max_upload_document_mb,
    ),
    max_upload_code_mb: parseIntSafe(
      getSetting(m, "max_upload_code_mb"),
      DEFAULTS_SETTINGS.max_upload_code_mb,
    ),
    max_upload_archive_mb: parseIntSafe(
      getSetting(m, "max_upload_archive_mb"),
      DEFAULTS_SETTINGS.max_upload_archive_mb,
    ),
  };
};
export async function getSettingsAction(
  event: H3Event,
): Promise<SettingResult<Record<string, string>>> {
  try {
    await requireAdmin(event);

    const settings = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    settings.forEach((s) => {
      map[s.key] = s.value;
    });

    return { success: true, data: map };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to get settings." };
  }
}
export async function updateAppSettingsAction(
  event: H3Event,
  data: AppSettingsInput,
): Promise<SettingResult> {
  try {
    await requireAdmin(event);

    const parsed = appSettingsSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors as Record<
          string,
          string[]
        >,
      };
    }

    const settingsToUpdate = [
      { key: "site_name", value: parsed.data.site_name, group_name: "general" },
      {
        key: "site_description",
        value: parsed.data.site_description ?? "",
        group_name: "general",
      },
      {
        key: "is_maintenance",
        value: String(parsed.data.is_maintenance),
        group_name: "general",
      },
      {
        key: "enable_register",
        value: String(parsed.data.enable_register),
        group_name: "auth",
      },
      {
        key: "enable_github_provider",
        value: String(parsed.data.enable_github_provider),
        group_name: "auth",
      },
      {
        key: "enable_google_provider",
        value: String(parsed.data.enable_google_provider),
        group_name: "auth",
      },
    ];

    await prisma.$transaction(
      settingsToUpdate.map((s) =>
        prisma.setting.upsert({
          where: {
            setting_key_group_name_unique: {
              key: s.key,
              group_name: s.group_name,
            },
          },
          update: { value: s.value },
          create: s,
        }),
      ),
    );

    return { success: true, message: "Settings saved successfully." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to save settings." };
  }
}
export async function getSettingAction(
  key: string,
  group_name = "general",
): Promise<string | null> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { setting_key_group_name_unique: { key, group_name } },
    });
    return setting?.value ?? null;
  } catch (error) {
    console.error(`Failed to get app setting (${group_name}.${key}): ${error}`);
    return null;
  }
}
export const buildSettingMap = (rows: SettingRow[]): Map<string, string> => {
  const sorted = [...rows].sort((a, b) => {
    const ta = a.updated_at?.getTime() ?? 0;
    const tb = b.updated_at?.getTime() ?? 0;
    return ta - tb;
  });
  return new Map(sorted.map((r) => [r.key, r.value] as [string, string]));
};
export const getSetting = (
  m: Map<string, string>,
  key: string,
): string | undefined => {
  const defaultValue = (
    DEFAULTS_SETTINGS as unknown as Record<string, unknown>
  )[key];
  return normalizeScalar(m.get(key) ?? (defaultValue as string | undefined));
};

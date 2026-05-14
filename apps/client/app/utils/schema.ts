import * as z from "zod";

const dateSchema = z.date().refine(
  (val) => {
    // Reset jam ke 00:00 untuk perbandingan tanggal murni
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    oneYearFromNow.setHours(23, 59, 59, 999);

    return val >= today && val <= oneYearFromNow;
  },
  {
    message: "Date must be between today and 1 year in the future",
  }
);
const formDateSchema = z.coerce.date().refine(
  (val) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    return val >= today && val <= oneYearFromNow;
  },
  { message: "Input cannot be less than today or more than 1 year old" }
);
export const getDynamicDates = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const oneMonthFromNow = new Date();
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  oneYearFromNow.setHours(23, 59, 59, 999);

  return { today, oneMonthFromNow, oneYearFromNow };
};
const expiredAtSchema = z
  .union([z.date(), z.string().datetime({ offset: true }).transform(val => new Date(val))])
  // Mengisi default secara dinamis setiap kali fungsi parse dipanggil
  .default(() => getDynamicDates().oneMonthFromNow)
  // Validasi batas minimal hari ini dan maksimal 1 tahun
  .refine(
    (val) => {
      const { today, oneYearFromNow } = getDynamicDates();
      const dateVal = val instanceof Date ? val : new Date(val);
      return dateVal >= today && dateVal <= oneYearFromNow;
    },
    {
      message: "Tanggal kedaluwarsa harus antara hari ini hingga 1 tahun ke depan",
    }
  );

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .email("Format email is not valid."),
  password: z
    .string()
    .min(1, "Password is required.")
    .min(8, "Password must be at least 8 characters."),
});
export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required.")
      .min(2, "Name must be at least 2 characters.")
      .max(100, "Name must be at most 100 characters.")
      .regex(
        /^[a-zA-Z\s'-]+$/,
        "Name must contain only letters, spaces, apostrof, and strip.",
      ),
    email: z
      .string()
      .min(1, "Email is required.")
      .email("Format email is not valid.")
      .max(255, "Email is too long."),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters long" })
      .max(32, { message: "Password must be at most 32 characters long" })
      .regex(/[a-z]/, {
        message: "Password must contain at least one lowercase letter",
      })
      .regex(/[A-Z]/, {
        message: "Password must contain at least one uppercase letter",
      })
      .regex(/[0-9]/, { message: "Password must contain at least one number" })
      .regex(/[^a-zA-Z0-9]/, {
        message: "Password must contain at least one special character",
      })
      .trim(),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi."),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password do not match.",
        path: ["confirmPassword"],
      });
    }
  });
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .email("Format email is not valid."),
});
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password must be at most 72 characters.")
      .regex(/[A-Z]/, "Password must contain uppercase letters.")
      .regex(/[0-9]/, "Password must contain numbers."),
    confirmPassword: z.string().min(1, "Konfirmasi password is required."),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Password do not match.",
      });
    }
  });

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name must be at most 100 characters.")
    .optional(),
  avatar: z
    .string()
    .nullable()
    .optional()
});
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password must be at most 72 characters.")
      .regex(/[A-Z]/, "Password must contain uppercase letters.")
      .regex(/[0-9]/, "Password must contain numbers."),
    confirmNewPassword: z.string().min(1, "Password confirmation is required."),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmNewPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password do not match.",
        path: ["confirmNewPassword"],
      });
    }
  });

export const saveApiKeySchema = z.object({
  provider: z.string().min(1, "Provider is required."),
  api_key: z
    .string()
    .min(8, "API key must be at least 8 characters.")
    .max(500, "API key is too long."),
  label: z
    .string()
    .max(100, "Label is too long.")
    .optional()
    .transform((v) => v ?? ""),
});

const siteAssetSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      if (!value) return true;
      if (value.startsWith("/")) return true;
      return /^https?:\/\/.+/i.test(value);
    },
    {
      message: "Must be a valid URL or root-relative path",
    },
  );

export const webSettingsSchema = z.object({
  site_name: z.string().min(1).max(100),
  site_description: z
    .string()
    .max(500)
    .optional()
    .transform((v) => v ?? ""),
  site_keywords: z
    .string()
    .max(255)
    .optional()
    .transform((v) => v ?? ""),
  site_icon: siteAssetSchema.optional().transform((v) => v ?? ""),
  site_logo: siteAssetSchema.optional().transform((v) => v ?? ""),
  site_favicon: siteAssetSchema.optional().transform((v) => v ?? ""),

});
export const generalSettingSchema = z.object({
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
})

export const PROJECT_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#f97316", // orange
  "#14b8a6", // teal
  "#64748b", // slate
] as const;
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(2, "Project name must be at least 2 characters.")
    .max(100, "Project name must be at most 100 characters.")
    .trim(),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters.")
    .optional()
    .transform((v) => v ?? ""),
  emoji: z
    .string()
    .max(10, "Emoji is too long.")
    .optional()
    .transform((v) => v ?? ""),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color format.")
    .optional()
    .transform((v) => v ?? ""),
  system_prompt: z
    .string()
    .max(4000, "System prompt must be at most 4000 characters.")
    .optional()
    .transform((v) => v ?? ""),
});
export const updateProjectSchema = createProjectSchema.extend({
  is_pinned: z.boolean().optional(),
  is_archived: z.boolean().optional(),
});
export const createConversationSchema = z.object({
  title: z.string().min(1, "Title is required field.").max(200).trim(),
  provider: z.string().min(1, "Provider is required field."),
  model_id: z.string().min(1, "Model is required field."),
  skill: z
    .enum(["TEXT", "IMAGE", "VIDEO", "AUDIO", "MULTIMODAL"])
    .default("TEXT"),
  project_id: z.string().optional().nullable(),
});
export const premiumConfigSchema = z.object({
  sessionMode: z.enum(["standard", "premium"]).default("standard"),
  provider: z.string().min(1, "Provider is required field."),
  os: z.string().min(1, "OS is required field."),
  osVersion: z.string().min(1, "OS version is required field."),
  browserType: z.string().min(1, "Browser type is required field."),
  browserVersion: z.string().min(1, "Browser version is required field."),
})
export const geoTargetSchema = z.object({
  country: z.string().length(2, "Kode negara harus 2 karakter"),
  weight: z.number().min(1).max(100).default(100),
  proxyPoolId: z.string().uuid().optional().nullable(),
  proxySource: z.enum(["pool", "integration", "none"]).default("none"),
  integrationId: z.string().uuid().optional().nullable(),
});
export const createCampaignSchema = z
  .object({
    name: z.string().min(1, "Campaign name is required"),
    targetUrl: z.string().url("URL is not valid field"),
    description: z.string().optional(),
    dailyLimit: z.number().min(1),
    totalLimit: z.number().min(1).optional().nullable(),
    maxConcurrent: z.number().min(1).max(50),
    speedMode: z.enum(["slow", "normal", "fast"]),
    geoMode: z.enum(["single", "multiple", "weighted", "dynamic"]),
    deviceType: z.enum(["desktop", "mobile", "tablet", "random"]),
    geoTargets: z.array(geoTargetSchema).max(20).default([]),
    behaviorProfileId: z.string().optional().nullable(),
    bounceRate: z.number().min(0).max(100),
    minDuration: z.number().min(5),
    maxDuration: z.number().min(5),
    scheduleEnabled: z.boolean().default(false),
    scheduleStart: z.string().optional(),
    scheduleEnd: z.string().optional(),
    scheduleDays: z.array(z.number()).optional(),
    timezone: z.string().optional(),
    webhookUrl: z.string().optional(),
    webhookEnabled: z.boolean().default(false),
    customClickEnabled: z.boolean().default(false),
    customClickTargets: z.array(z.object({
      selector: z.string().min(1, "Selector is required"),
      selectorType: z.enum(["css", "id", "xpath", "text", "attribute"]).default("css"),
      clickRate: z.number().min(0).max(100),
      waitBefore: z.number().min(0).max(10000),
      waitAfter: z.number().min(0).max(10000),
      description: z.string().optional().nullable(),
    })).optional().default([]),
    customClickOrder: z.enum(["sequential", "random"]).default("sequential"),
    customClickMaxPerSession: z.number().min(1).max(100),
    sessionMode: z.enum(["standard", "premium"]).default("standard"),
    provider: z.enum([
      'gologin', 'adspower', 'multilogin', 'dolphin', 'nstbrowser'
    ]).optional().nullable(),
    os: z.enum([
      'windows', 'macos', 'linux', 'android', 'ios'
    ]).optional().nullable(),
    osVersion: z.string().min(1, "OS version is required field."),
    browserType: z.enum([
      'chrome', 'firefox', 'safari', 'edge'
    ]).optional().nullable(),
    browserVersion: z.string().max(20).optional().nullable(),
  })
  .refine((d) => d.minDuration < d.maxDuration, {
    message: "Min duration must be less than max duration.",
    path: ["minDuration", "maxDuration"],
  })
  .refine((d) => !d.scheduleEnabled || (d.scheduleStart && d.scheduleEnd), {
    message: "Schedule start & end are required if scheduler is enabled.",
    path: ["scheduleStart", "scheduleEnd"],
  }).refine(d => {
    d.webhookEnabled && !d.webhookUrl,
      { message: "Webhook URL is required." }
  }).refine(
    d => d.sessionMode !== 'premium' || !!d.provider,
    { message: 'Provider is required for Premium Mode', path: ['provider'] }
  ).refine(
    d => d.sessionMode !== 'premium' || !!d.os,
    { message: 'OS is required for Premium Mode', path: ['os'] }
  ).refine(
    d => {
      if (d.sessionMode !== 'premium' || !d.os || !d.browserType) return true
      const compat: Record<string, string[]> = {
        windows: ['chrome', 'firefox', 'edge'],
        macos: ['safari', 'chrome', 'firefox', 'edge'],
        linux: ['chrome', 'firefox'],
        android: ['chrome', 'firefox'],
        ios: ['safari', 'chrome'],
      }
      return (compat[d.os] ?? []).includes(d.browserType)
    },
    { message: 'Browser type is not compatible with OS.', path: ['browserType'] }
  )

export const userRole = z.enum(['superadmin', 'admin', 'moderator', 'user'])
export const statusActive = z.enum(['active', 'inactive'])
export const subscribtionPlan = z.enum(['free', 'starter', "pro", "enterprise"])
export const inviteUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(32, { message: "Password must be at most 32 characters long" })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter",
    })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[^a-zA-Z0-9]/, {
      message: "Password must contain at least one special character",
    })
    .trim(),
  plan: subscribtionPlan.default('free'),
  creditLimit: z.coerce.number().int().min(0).default(0),
  creditBalance: z.coerce.number().int().min(0).default(0),
  expiredAt: expiredAtSchema,
  isActive: z.boolean().default(true),
  emailVerified: z.boolean().default(false),
})
export const assignRoleSchema = z.object({
  role: userRole,
})
export const setStatusActiveSchema = z.object({
  status: statusActive,
})
export const updateUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional().nullable(),
  plan: subscribtionPlan.optional().nullable(),
  creditLimit: z.coerce.number().int().min(0).default(0).optional().nullable(),
  creditBalance: z.coerce.number().int().min(0).default(0).optional().nullable(),
  creditUsed: z.coerce.number().int().min(0).default(0).optional().nullable(),
  expiredAt: expiredAtSchema.optional().nullable(),
  isActive: z.boolean().default(true),
  emailVerified: z.boolean().default(false),
  isActiveSubscription: z.boolean().default(true),
})

export const LoginSchema = toTypedSchema(loginSchema);
export const RegisterSchema = toTypedSchema(registerSchema);
export const ForgotPasswordSchema = toTypedSchema(forgotPasswordSchema);
export const ResetPasswordSchema = toTypedSchema(resetPasswordSchema);
export const UpdateProfileSchema = toTypedSchema(updateProfileSchema);
export const ChangePasswordSchema = toTypedSchema(changePasswordSchema);
export const SaveApiKeySchema = toTypedSchema(saveApiKeySchema);
export const WebSettingsSchema = toTypedSchema(webSettingsSchema);
export const GeneralSettingSchema = toTypedSchema(generalSettingSchema);
export const CreateProjectSchema = toTypedSchema(createProjectSchema);
export const UpdateProjectSchema = toTypedSchema(updateProjectSchema);
export const CreateConversationSchema = toTypedSchema(createConversationSchema);
export const CreateCampaignSchema = toTypedSchema(createCampaignSchema);
export const GeoTargetSchema = toTypedSchema(geoTargetSchema);
export const PremiumConfigSchema = toTypedSchema(premiumConfigSchema);
export const InviteUserSchema = toTypedSchema(inviteUserSchema);
export const AssignRoleSchema = toTypedSchema(assignRoleSchema);
export const SetActiveSchema = toTypedSchema(setStatusActiveSchema);
export const UpdateUserSchema = toTypedSchema(updateUserSchema);

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SaveApiKeyInput = z.infer<typeof saveApiKeySchema>;
export type WebSettingsInput = z.infer<typeof webSettingsSchema>;
export type GeneralSettingInput = z.infer<typeof generalSettingSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type GeoTargetInput = z.infer<typeof geoTargetSchema>;
export type PremiumConfigInput = z.infer<typeof premiumConfigSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
export type SetActiveInput = z.infer<typeof setStatusActiveSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
// ============================================================
// Premium Campaign
// ============================================================

export const premiumModeSchema = z.object({
  // Mode: standard (built-in) atau premium (antidetect)
  sessionMode: z.enum(['standard', 'premium']).default('standard'),
  provider: z.enum(['gologin', 'adspower', 'multilogin', 'dolphin', 'nstbrowser']).optional(),
  os: z.enum(['windows', 'macos', 'linux', 'android', 'ios']).optional(),
  osVersion: z.string().optional(),
  browserType: z.enum(['chrome', 'firefox', 'safari', 'edge']).optional(),
  browserVersion: z.string().optional(),
})


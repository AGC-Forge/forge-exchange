import * as z from "zod"

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
      .regex(/^[a-zA-Z\s'-]+$/, "Name must contain only letters, spaces, apostrof, and strip."),
    email: z
      .string()
      .min(1, "Email is required.")
      .email("Format email is not valid.")
      .max(255, "Email is too long."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password must be at most 72 characters.")
      .regex(/[A-Z]/, "Password must contain uppercase letters.")
      .regex(/[0-9]/, "Password must contain numbers."),
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
  phone: z
    .string()
    .regex(/^\+?[0-9]{8,15}$/, "Format phone is not valid.")
    .optional()
    .or(z.literal("")),
  avatar: z.string().url("URL avatar is not valid.").optional().or(z.literal("")),
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
  label: z.string().max(100, "Label is too long.").optional().or(z.literal("")),
});

export const appSettingsSchema = z.object({
  site_name: z.string().min(1).max(100),
  site_description: z.string().max(500).optional().or(z.literal("")),
  is_maintenance: z.boolean(),
  enable_register: z.boolean(),
  enable_github_provider: z.boolean(),
  enable_google_provider: z.boolean(),
  default_provider: z.string().optional(),
  default_model_id: z.string().optional(),
});

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
    .min(1, "Project name is required field.")
    .min(2, "Project name must be at least 2 characters.")
    .max(100, "Project name must be at most 100 characters.")
    .trim(),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters.")
    .optional()
    .or(z.literal("")),
  emoji: z
    .string()
    .max(10, "Emoji is too long.")
    .optional()
    .or(z.literal("")),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color format.")
    .optional()
    .or(z.literal("")),
  system_prompt: z
    .string()
    .max(4000, "System prompt must be at most 4000 characters.")
    .optional()
    .or(z.literal("")),
});
export const updateProjectSchema = createProjectSchema.extend({
  is_pinned: z.boolean().optional(),
  is_archived: z.boolean().optional(),
});
export const createConversationSchema = z.object({
  title: z.string().min(1, "Title is required field.").max(200).trim(),
  provider: z.string().min(1, "Provider is required field."),
  model_id: z.string().min(1, "Model is required field."),
  skill: z.enum(["TEXT", "IMAGE", "VIDEO", "AUDIO", "MULTIMODAL"]).default("TEXT"),
  project_id: z.string().optional().nullable(),
});


export const LoginSchema = toTypedSchema(loginSchema);
export const RegisterSchema = toTypedSchema(registerSchema);
export const ForgotPasswordSchema = toTypedSchema(forgotPasswordSchema);
export const ResetPasswordSchema = toTypedSchema(resetPasswordSchema);
export const UpdateProfileSchema = toTypedSchema(updateProfileSchema);
export const ChangePasswordSchema = toTypedSchema(changePasswordSchema);
export const SaveApiKeySchema = toTypedSchema(saveApiKeySchema);
export const AppSettingsSchema = toTypedSchema(appSettingsSchema);
export const CreateProjectSchema = toTypedSchema(createProjectSchema);
export const UpdateProjectSchema = toTypedSchema(updateProjectSchema);
export const CreateConversationSchema = toTypedSchema(createConversationSchema);

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SaveApiKeyInput = z.infer<typeof saveApiKeySchema>;
export type AppSettingsInput = z.infer<typeof appSettingsSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

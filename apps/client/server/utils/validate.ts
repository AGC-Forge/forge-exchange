import { z } from "zod";

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
const getDynamicDates = () => {
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
// ============================================================
// User Validation
// ============================================================
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
export const updateAvatarOnlySchema = z.object({
  avatar: z
    .string()
    .url("URL avatar is not valid.")
    .optional()
    .transform((v) => v ?? ""),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateAvatarOnlyInput = z.infer<typeof updateAvatarOnlySchema>;
// ============================================================
// Campaigns Validation
// ============================================================
export const customClickTargetSchema = z.object({
  selector: z.string().min(1, "Selector wajib diisi"),
  clickRate: z.number().min(1).max(100),
  waitBefore: z.number().min(0).max(30000),
  waitAfter: z.number().min(0).max(30000),
  description: z.string().optional(),
});
export const geoTargetSchema = z
  .object({
    country: z.string().length(2, "Kode negara harus 2 karakter"),
    weight: z.number().min(1).max(100).default(100),
    proxyPoolId: z.string().uuid().optional().nullable(),
    proxySource: z.enum(["pool", "integration", "none"]).default("none"),
    integrationId: z.string().uuid().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.proxySource === "pool" && !value.proxyPoolId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pilih proxy pool atau ubah mode ke Tanpa Proxy.",
        path: ["proxyPoolId"],
      });
    }

    if (value.proxySource === "integration" && !value.integrationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pilih integration proxy atau ubah mode ke Tanpa Proxy.",
        path: ["integrationId"],
      });
    }
  });
export const createCampaignSchema = z
  .object({
    name: z.string().min(1, "Nama campaign wajib diisi").max(255),
    description: z.string().max(1000).optional(),
    targetUrl: z.string().url("Target URL tidak valid"),

    // Traffic config
    dailyLimit: z.number().int().min(1).max(100000).default(100),
    totalLimit: z.number().int().min(1).optional().nullable(),
    maxConcurrent: z.number().int().min(1).max(50).default(5),
    speedMode: z.enum(["slow", "normal", "fast"]).default("normal"),

    // Targeting
    deviceType: z
      .enum(["desktop", "mobile", "tablet", "random"])
      .default("desktop"),
    geoMode: z
      .enum(["single", "multiple", "weighted", "dynamic"])
      .default("single"),
    geoTargets: z.array(geoTargetSchema).max(20).default([]),

    // Behavior
    behaviorProfileId: z.string().uuid().optional().nullable(),
    minDuration: z.number().int().min(5).max(3600).default(30),
    maxDuration: z.number().int().min(5).max(3600).default(180),
    bounceRate: z.number().int().min(0).max(100).default(20),

    // Scheduler
    scheduleEnabled: z.boolean().default(false),
    scheduleStart: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional()
      .nullable(),
    scheduleEnd: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional()
      .nullable(),
    scheduleDays: z.array(z.number().int().min(0).max(6)).default([]),
    timezone: z.string().default("UTC"),

    // Webhook
    webhookUrl: z.string().url().optional().nullable(),
    webhookEnabled: z.boolean().default(false),
    customClickEnabled: z.boolean().default(false),
    customClickTargets: z.array(z.object({
      selector: z.string().min(1, "Selector is required"),
      selectorType: z.enum(["css", "id", "xpath", "text", "attribute"]),
      clickRate: z.number().min(0).max(100),
      waitBefore: z.number().min(0).max(10000),
      waitAfter: z.number().min(0).max(10000),
      description: z.string().optional(),
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
  );
// ── Update Campaign schema — manual definition (partial can't be used on refined schemas) ──
export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  targetUrl: z.string().url().optional(),
  dailyLimit: z.number().int().min(1).max(100000).optional(),
  totalLimit: z.number().int().min(1).optional().nullable(),
  maxConcurrent: z.number().int().min(1).max(50).optional(),
  speedMode: z.enum(["slow", "normal", "fast"]).optional(),
  deviceType: z.enum(["desktop", "mobile", "tablet", "random"]).optional(),
  geoMode: z.enum(["single", "multiple", "weighted", "dynamic"]).optional(),
  geoTargets: z.array(geoTargetSchema).max(20).optional(),
  behaviorProfileId: z.string().uuid().optional().nullable(),
  minDuration: z.number().int().min(5).max(3600).optional(),
  maxDuration: z.number().int().min(5).max(3600).optional(),
  bounceRate: z.number().int().min(0).max(100).optional(),
  scheduleEnabled: z.boolean().optional(),
  scheduleStart: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  scheduleEnd: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  scheduleDays: z.array(z.number().int().min(0).max(6)).optional(),
  timezone: z.string().optional(),
  webhookUrl: z.string().url().optional().nullable(),
  webhookEnabled: z.boolean().optional(),
  customClickEnabled: z.boolean().default(false),
  customClickTargets: z.array(z.object({
    selector: z.string().min(1, "Selector is required"),
    selectorType: z.enum(["css", "id", "xpath", "text", "attribute"]),
    clickRate: z.number().min(0).max(100),
    waitBefore: z.number().min(0).max(10000),
    waitAfter: z.number().min(0).max(10000),
    description: z.string().optional(),
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
});
// ── Query params untuk list campaigns ────────────────────────
export const listCampaignQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum([
      "draft",
      "queued",
      "running",
      "paused",
      "completed",
      "failed",
      "cancelled",
    ])
    .optional(),
  search: z.string().max(100).optional(),
  orderBy: z
    .enum(["createdAt", "name", "status", "totalSessions"])
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type ListCampaignQuery = z.infer<typeof listCampaignQuerySchema>;
export type GeoTargetInput = z.infer<typeof geoTargetSchema>;

// ============================================================
// Proxy Validation
// ============================================================

export const proxyTypeEnum = z.enum([
  'http', 'https', 'socks5', 'residential', 'mobile', 'isp', 'rotating'
])
export const addProxySchema = z.object({
  name: z.string().max(255).optional(),
  type: proxyTypeEnum,
  host: z.string().min(1, 'Host wajib diisi').max(255),
  port: z.number().int().min(1).max(65535),
  username: z.string().max(255).optional().nullable(),
  password: z.string().max(500).optional().nullable(),
  country: z.string().length(2).toUpperCase().optional().nullable(),
  isShared: z.boolean().default(false),
  rotationInterval: z.number().int().min(60).optional().nullable(),
})
export const updateProxySchema = z.object({
  name: z.string().max(255).optional(),
  type: proxyTypeEnum,
  host: z.string().min(1, 'Host wajib diisi').max(255),
  port: z.number().int().min(1).max(65535),
  username: z.string().max(255).optional().nullable(),
  password: z.string().max(500).optional().nullable(),
  country: z.string().length(2).toUpperCase().optional().nullable(),
  isShared: z.boolean().default(false),
  rotationInterval: z.number().int().min(60).optional().nullable(),
})
export const listProxyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'inactive', 'testing', 'banned', 'error']).optional(),
  type: proxyTypeEnum.optional(),
  country: z.string().length(2).optional(),
  search: z.string().max(100).optional(),
})

// Bulk import — 1 proxy per line
// Format: type://user:pass@host:port:country
// atau:   host:port:user:pass:type:country
export const bulkImportSchema = z.object({
  raw: z.string().min(1, 'Proxy list wajib diisi'),
  type: proxyTypeEnum.default('http'), // default type kalau tidak ada di baris
})

export type AddProxyInput = z.infer<typeof addProxySchema>
export type BulkImportInput = z.infer<typeof bulkImportSchema>
export type ListProxyQuery = z.infer<typeof listProxyQuerySchema>

// ============================================================
// Billing Validation
// ============================================================

export const topUpSchema = z.object({
  amount: z.number().int().min(10000, 'Minimal topup Rp 10.000').max(100_000_000),
  gateway: z.enum(['midtrans', 'xendit', 'paypal']).default('midtrans'),
})
export const creditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['debit', 'credit', 'refund', 'bonus']).optional(),
})

export type TopUpInput = z.infer<typeof topUpSchema>
export type CreditLogQuery = z.infer<typeof creditLogQuerySchema>

// Credit packages — harga dalam IDR


// Subscription plans

// ============================================================
// Billing Integrations
// ============================================================
export const integrationTypeEnum = z.enum([
  // Proxy
  'residential_proxy',
  'mobile_proxy',
  'socks5_proxy',
  'rotating_proxy',
  'brightdata',
  'oxylabs',
  'iproyal',
  'smartproxy',
  // Antidetect
  'gologin',
  'adspower',
  'multilogin',
  'dolphin',
  'nstbrowser',
  // CAPTCHA
  'capmonster',
  'twocaptcha',
  'anticaptcha',
  'turnstile',
])
export const credentialSchema = z.object({
  username: z.string().max(255).optional().nullable(),
  password: z.string().max(500).optional().nullable(),
  host: z.string().max(255).optional().nullable(),
  port: z
    .preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.coerce.number().int(),
    )
    .optional()
    .nullable(),
  rotateUrl: z.string().max(255).optional().nullable(),
  proxyType: proxyTypeEnum.optional().nullable(),
  rotationInterval: z
    .preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.coerce.number().int().min(60),
    )
    .optional()
    .nullable(),
  apiKey: z.string().max(255).optional().nullable(),
  apiUrl: z.string().max(255).optional().nullable(),
  workspaceId: z.string().optional().nullable(),
  apiPort: z
    .preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.coerce.number().int(),
    )
    .optional()
    .nullable(),
  solverType: z.string().optional().nullable(),
})
export const createIntegrationsSchema = z.object({
  type: integrationTypeEnum,
  name: z.string().max(255),
  isActive: z.boolean().default(true),
  credentials: credentialSchema,
  config: z.record(z.string(), z.any()).optional().nullable(),
})
export const updateIntegrationSchema = z.object({
  name: z.string().max(255).optional(),
  isActive: z.boolean().optional(),
  credentials: credentialSchema.optional(),
  config: z.record(z.string(), z.any()).optional().nullable(),
})
export const listIntegrationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'inactive']).optional(),
  type: integrationTypeEnum.optional(),
  isHealthy: z.boolean().optional(),
  lastTestedAt: z.coerce.date().optional(),
  search: z.string().max(100).optional(),
})

export type ListIntegrationQuery = z.infer<typeof listIntegrationQuerySchema>
export type IntegrationTypeEnum = z.infer<typeof integrationTypeEnum>
export type ProxyTypeEnum = z.infer<typeof proxyTypeEnum>
export type CreateIntegrationsInput = z.infer<typeof createIntegrationsSchema>
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

// ============================================================
// Admin Users
// ============================================================
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
export const listUserQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: statusActive.optional(),
  role: userRole.optional(),
  search: z.string().max(100).optional(),
  orderBy: z.enum(['id', 'email', 'name', 'createdAt', 'updatedAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('asc'),
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

export type InviteUserInput = z.infer<typeof inviteUserSchema>
export type UserRole = z.infer<typeof userRole>
export type StatusActive = z.infer<typeof statusActive>
export type SubscribtionPlan = z.infer<typeof subscribtionPlan>
export type ListUserQuery = z.infer<typeof listUserQuerySchema>
export type AssignRoleInput = z.infer<typeof assignRoleSchema>
export type SetActiveInput = z.infer<typeof setStatusActiveSchema>
// ============================================================
// Global Schema
// ============================================================

export const bulkDeleteByIdsSchema = z.object({
  ids: z.array(z.string({ message: 'IDs must be an array of strings' }))
    .min(1, { message: 'At least one ID is required' })
    .max(100, { message: 'Maximum 100 IDs are allowed' }),
})
export const bulkDeleteTransactionSchema = z.object({
  ids: z.array(z.string({ message: 'IDs must be an array of strings' }))
    .min(1, { message: 'At least one ID is required' })
    .max(100, { message: 'Maximum 100 IDs are allowed' }),
  type: z.enum(['topUp', 'subscription']).default('topUp'),
})
export const listTransactionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'paid', 'failed', 'expired', 'refunded']).optional(),
  search: z.string().max(100).optional(),
  orderBy: z.enum(['createdAt', 'updatedAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('asc'),
  gateway: z.enum(['midtrans', 'xendit', 'paypal']).optional(),
  isActive: z.coerce.boolean().optional(),
  plan: z.enum(['free', 'starter', "pro", "enterprise"]).optional(),
  type: z.enum(['topup', 'subscription']).default('topup'),
})

export type BulkDeleteByIdsInput = z.infer<typeof bulkDeleteByIdsSchema>
export type ListTransactionQuery = z.infer<typeof listTransactionQuerySchema>
// ============================================================
// Checker Tools
// ============================================================
export const proxyCheckerTargetUrlSchema = z.enum([
  'http://httpbin.org/ip',
  'https://ipinfo.io',
  'https://ifconfig.me',
  'https://icanhazip.com',
  'http://httpbin.org',
])
export const proxyCheckerTypeSchema = z.enum([
  'http', 'https', 'socks5', 'residential', 'mobile', 'isp', 'rotating', 'auto'
])
export const proxyFormatterSchema = z.enum([
  'user:pass@host:port',
  'user:pass:host:port',   // colon separator (no @)
  'host:port@user:pass',
  'host:port:user:pass',
  'host:port',
  'user:pass@host:port:country',
  'user:pass:host:port:country',
])
export const bulkProxyCheckerSchema = z.object({
  proxyType: proxyCheckerTypeSchema.default('http'),
  formatter: proxyFormatterSchema.default('user:pass@host:port'),
  proxies: z.array(z.string()).min(1, "At least one proxy is required").max(100, "Maximum 100 proxies allowed"),
})

export type BulkProxyCheckerInput = z.infer<typeof bulkProxyCheckerSchema>;
export type ProxyCheckerTargetUrl = z.infer<typeof proxyCheckerTargetUrlSchema>;
export type ProxyCheckerType = z.infer<typeof proxyCheckerTypeSchema>;
export type ProxyFormatter = z.infer<typeof proxyFormatterSchema>;

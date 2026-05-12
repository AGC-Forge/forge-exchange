import { z } from "zod";

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
export const geoTargetSchema = z.object({
  country: z.string().length(2, "Kode negara harus 2 karakter"),
  weight: z.number().min(1).max(100).default(100),
  proxyPoolId: z.string().uuid().optional().nullable(),
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
  gateway: z.enum(['midtrans', 'xendit']).default('midtrans'),
})

export const creditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['debit', 'credit', 'refund', 'bonus']).optional(),
})

export type TopUpInput = z.infer<typeof topUpSchema>
export type CreditLogQuery = z.infer<typeof creditLogQuerySchema>

// Credit packages — harga dalam IDR
export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'pack_10k', credits: 10_000, priceIdr: 50_000, label: '10K Credits', bonus: 0 },
  { id: 'pack_50k', credits: 50_000, priceIdr: 200_000, label: '50K Credits', bonus: 5000 },
  { id: 'pack_100k', credits: 100_000, priceIdr: 350_000, label: '100K Credits', bonus: 15000 },
  { id: 'pack_500k', credits: 500_000, priceIdr: 1_500_000, label: '500K Credits', bonus: 100000 },
] as const

// Subscription plans
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 100,
    period: 'day',
    features: ['100 credit/hari', '2 campaign', 'Basic proxy', 'Email support'],
    color: 'slate',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 99_000,
    credits: 10_000,
    period: 'month',
    features: ['10K credit/bulan', '10 campaign', 'Residential proxy', 'Priority support'],
    color: 'indigo',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 299_000,
    credits: 100_000,
    period: 'month',
    features: ['100K credit/bulan', '50 campaign', 'Mobile + Residential', 'Multi GEO', '24/7 support'],
    color: 'purple',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0,
    credits: 0,
    period: 'month',
    features: ['Custom credit', 'Unlimited campaign', 'Dedicated proxy', 'SLA + API', 'Custom integration'],
    color: 'amber',
  },
] as const

// ============================================================
// Billing Integrations
// ============================================================
export const integrationTypeEnum = z.enum([
  'residential_proxy', 'mobile_proxy', 'multilogin', 'gologin', 'adspower', 'capmonster', 'twocaptcha', 'turnstile'
])
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
export const OS_BROWSER_COMPAT: Record<string, string[]> = {
  windows: ['chrome', 'firefox', 'edge', 'opera'],
  macos: ['safari', 'chrome', 'firefox', 'edge'],
  linux: ['chrome', 'firefox'],
  android: ['chrome', 'firefox'],
  ios: ['safari', 'chrome'],
}

export const OS_VERSIONS: Record<string, { label: string; value: string }[]> = {
  windows: [
    { label: 'Windows 11', value: '11' },
    { label: 'Windows 10', value: '10' },
  ],
  macos: [
    { label: 'macOS Sonoma (14)', value: '14' },
    { label: 'macOS Ventura (13)', value: '13' },
    { label: 'macOS Monterey (12)', value: '12' },
  ],
  linux: [
    { label: 'Ubuntu 22.04', value: 'ubuntu22' },
    { label: 'Ubuntu 20.04', value: 'ubuntu20' },
    { label: 'Debian 12', value: 'debian12' },
  ],
  android: [
    { label: 'Android 14', value: '14' },
    { label: 'Android 13', value: '13' },
    { label: 'Android 12', value: '12' },
    { label: 'Android 11', value: '11' },
  ],
  ios: [
    { label: 'iOS 17', value: '17' },
    { label: 'iOS 16', value: '16' },
    { label: 'iOS 15', value: '15' },
  ],
}

export const BROWSER_VERSIONS: Record<string, { label: string; value: string }[]> = {
  chrome: [
    { label: 'Chrome 121', value: '121' },
    { label: 'Chrome 120', value: '120' },
    { label: 'Chrome 119', value: '119' },
  ],
  firefox: [
    { label: 'Firefox 122', value: '122' },
    { label: 'Firefox 121', value: '121' },
    { label: 'Firefox 120', value: '120' },
  ],
  safari: [
    { label: 'Safari 17', value: '17' },
    { label: 'Safari 16', value: '16' },
  ],
  edge: [
    { label: 'Edge 121', value: '121' },
    { label: 'Edge 120', value: '120' },
  ],
}
// Credit cost per session mode
export const SESSION_CREDIT_COST: Record<string, number> = {
  standard: 1,
  gologin: 4,
  adspower: 3,
  multilogin: 5,
  dolphin: 3,
  nstbrowser: 4,
}

import { z } from "zod";

// ── Custom Click Target schema ────────────────────────────────
export const customClickTargetSchema = z.object({
  selector: z.string().min(1, "Selector wajib diisi"),
  clickRate: z.number().min(1).max(100),
  waitBefore: z.number().min(0).max(30000),
  waitAfter: z.number().min(0).max(30000),
  description: z.string().optional(),
});
// ── GEO Target schema ─────────────────────────────────────────
export const geoTargetSchema = z.object({
  country: z.string().length(2, "Kode negara harus 2 karakter"),
  weight: z.number().min(1).max(100).default(100),
  proxyPoolId: z.string().uuid().optional().nullable(),
});
// ── Create Campaign schema ────────────────────────────────────
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
  })
  .refine((d) => d.minDuration < d.maxDuration, {
    message: "Min duration harus lebih kecil dari max duration",
    path: ["minDuration"],
  })
  .refine((d) => !d.scheduleEnabled || (d.scheduleStart && d.scheduleEnd), {
    message: "Schedule start & end wajib jika scheduler aktif",
    path: ["scheduleStart"],
  });
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

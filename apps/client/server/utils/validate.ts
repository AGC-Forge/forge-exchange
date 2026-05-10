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

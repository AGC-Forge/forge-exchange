import { z } from "zod";
import { prisma } from "../utils/db";
import { DEFAULTS_SETTINGS } from "../utils/setting";
import { requireAdmin } from "../utils/admin";

const allowedKeys = new Set<string>([
  ...Object.keys(DEFAULTS_SETTINGS),
  "default_provider",
  "default_model_id",
]);

const updateItemSchema = z.object({
  key: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  group_name: z.string().min(1).optional(),
});

const schema = z.union([
  z.object({ updates: z.array(updateItemSchema).min(1) }),
  updateItemSchema,
]);

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const parsed = schema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid input" });
  }

  const updates = ("updates" in parsed.data ? parsed.data.updates : [parsed.data]).map(
    (u) => ({
      key: u.key,
      group_name: u.group_name ?? "general",
      value: u.value === null ? "" : String(u.value),
    }),
  );

  for (const u of updates) {
    if (!allowedKeys.has(u.key)) {
      throw createError({ statusCode: 400, statusMessage: "Invalid setting key" });
    }
  }

  await prisma.$transaction(
    updates.map((u) =>
      prisma.setting.upsert({
        where: { setting_key_group_name_unique: { key: u.key, group_name: u.group_name } },
        update: { value: u.value },
        create: { key: u.key, group_name: u.group_name, value: u.value },
      }),
    ),
  );

  return { ok: true };
});

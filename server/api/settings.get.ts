import type { H3Event } from "h3";
import { requireAdmin } from "../utils/admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const settings = await prisma.setting.findMany({
    select: { key: true, value: true, group_name: true, updated_at: true },
    orderBy: [{ group_name: "asc" }, { key: "asc" }],
  });

  return { settings };
});

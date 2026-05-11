import type { H3Event } from "h3";

export async function requireAdmin(event: H3Event) {
  const session = await getUserSession(event);
  const userId = session?.user?.id;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: { select: { level: true } } },
  });

  if (!user || !user.role || user.role.level === undefined || user.role.level > 1) {
    throw createError({ statusCode: 403, statusMessage: "Access denied" });
  }

  return { userId };
}

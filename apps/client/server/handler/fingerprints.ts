import { type H3Event } from "h3";

export const listRecentFingerprints = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event);
    const { user } = session;

    const query = getQuery(event);
    const requestedLimit = Number(query.limit ?? 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 50)
      : 10;

    const isAdmin = ["admin", "superadmin"].includes(user.role.name);
    const where = isAdmin ? {} : { userId: user.id };

    const rows = await prisma.fingerprint.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        userAgent: true,
        platform: true,
        language: true,
        timezone: true,
        screenWidth: true,
        screenHeight: true,
        webgl: true,
        canvas: true,
        createdAt: true
      }
    });

    return {
      success: true,
      message: "OK",
      data: {
        fingerprints: rows,
        total: rows.length
      }
    };
  } catch (error) {
    throw handleRequestError(error);
  }
};

import { type H3Event, H3Error } from "h3";
import { z } from "zod";
import { type BrowserSession } from "@forge-exchange/db";

export const liveSession = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session

    const isAdmin = ['admin', 'superadmin'].includes(user.role.name)
    const where: any = {
      status: 'running',
      ...(isAdmin ? {} : { userId: user.id }),
    }

    const sessions = await prisma.browserSession.findMany({
      where,
      take: 20,
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        targetUrl: true,
        targetCountry: true,
        observedCountry: true,
        executionSource: true,
        country: true,
        startedAt: true,
        campaign: {
          select: { id: true, name: true },
        },
      },
    })

    return {
      success: true,
      message: 'OK',
      data: {
        sessions: sessions.map(s => ({
          id: s.id,
          campaignName: s.campaign?.name ?? '—',
          targetUrl: s.targetUrl,
          targetCountry: s.targetCountry,
          observedCountry: s.observedCountry,
          executionSource: s.executionSource,
          country: s.country,
          deviceType: 'desktop',
          elapsedMs: s.startedAt
            ? Date.now() - new Date(s.startedAt).getTime()
            : 0,
        })),
      },
    }
  } catch (error) {
    throw handleRequestError(error);
  }
}

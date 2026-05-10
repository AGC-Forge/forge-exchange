import { type H3Event } from "h3";

export const listWorkers = async (event: H3Event) => {
  try {
    await requireUserSession(event)

    const workers = await prisma.workerNode.findMany({
      orderBy: { status: 'asc' },
      select: {
        id: true,
        name: true,
        hostname: true,
        ipAddress: true,
        region: true,
        status: true,
        maxBrowsers: true,
        activeBrowsers: true,
        maxConcurrent: true,
        activeSessions: true,
        cpuUsage: true,
        ramUsage: true,
        ramTotal: true,
        ramUsed: true,
        crashRate: true,
        lastHeartbeatAt: true,
        uptimeSince: true,
        version: true,
      },
    })

    return {
      success: true,
      message: 'OK',
      data: {
        workers: workers.map(w => ({
          ...w,
          ramTotal: w.ramTotal ? Number(w.ramTotal) : null,
          ramUsed: w.ramUsed ? Number(w.ramUsed) : null,
          isStale: w.lastHeartbeatAt
            ? Date.now() - new Date(w.lastHeartbeatAt).getTime() > 60_000
            : true,
        })),
        total: workers.length,
        online: workers.filter(w => w.status === 'online').length,
      },
    }
  } catch (error) {
    throw handleRequestError(error);
  }
}

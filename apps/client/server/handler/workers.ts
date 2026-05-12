import { type H3Event } from "h3";
import * as z from 'zod'
import { requireAdmin } from "../utils/admin";

export const listWorkers = async (event: H3Event) => {
  try {
    await requireAdmin(event)

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

export const listWorkersSummary = async (event: H3Event) => {
  try {
    await requireAdmin(event)

    const session = await getUserSession(event);
    const userId = session?.user?.id;
    if (!userId) {
      throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }

    const workers = await prisma.workerNode.findMany({
      orderBy: { status: "asc" },
      select: {
        id: true,
        name: true,
        region: true,
        status: true,
        maxBrowsers: true,
        activeBrowsers: true,
        maxConcurrent: true,
        activeSessions: true,
        cpuUsage: true,
        ramUsage: true,
        lastHeartbeatAt: true,
      },
    });

    return {
      success: true,
      message: "OK",
      data: {
        workers: workers.map((w) => ({
          ...w,
          isStale: w.lastHeartbeatAt
            ? Date.now() - new Date(w.lastHeartbeatAt).getTime() > 60_000
            : true,
        })),
        total: workers.length,
        online: workers.filter((w) => w.status === "online").length,
      },
    };
  } catch (error) {
    throw handleRequestError(error);
  }
};

const restartWorkerSchema = z.object({
  workerId: z.string().uuid(),
})
export const restartWorker = async (event: H3Event) => {
  try {
    await requireAdmin(event)

    const body = restartWorkerSchema.safeParse(await readBody(event))

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: 'worker id is required',
        data: body.error.issues,
      })
    }

    await prisma.workerNode.update({
      where: {
        id: body.data.workerId,
      },
      data: {
        status: 'restarting',
      },
    })

    return {
      success: true,
      message: 'OK',
    }
  } catch (error) {
    throw handleRequestError(error);
  }
}

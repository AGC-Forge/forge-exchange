import type { WorkerNodeStore } from "@forge-exchange/worker-kit/server";
import { prismaWorker } from "@forge-exchange/db";

export const workerNodeStore: WorkerNodeStore = {
  async upsertNode(input) {
    await prismaWorker.workerNode.upsert({
      where: { id: input.id },
      update: {
        status: input.status as any,
        hostname: input.hostname,
        ipAddress: input.ipAddress,
        uptimeSince: input.uptimeSince,
        version: input.version,
      },
      create: {
        id: input.id,
        name: input.name,
        hostname: input.hostname,
        ipAddress: input.ipAddress,
        region: input.region,
        status: input.status as any,
        maxBrowsers: input.maxBrowsers,
        maxConcurrent: input.maxConcurrent,
        uptimeSince: input.uptimeSince,
        version: input.version,
      },
    });
  },
  async updateNode(id, data) {
    await prismaWorker.workerNode.update({
      where: { id },
      data: data as any,
    });
  },
  async getNodeStatus(id) {
    const node = await prismaWorker.workerNode.findUnique({
      where: { id },
      select: { status: true },
    });
    return (node?.status as any) ?? null;
  },
};

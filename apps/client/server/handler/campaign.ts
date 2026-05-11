
import { type H3Event } from "h3";
import { estimateCredits, checkCreditBalance } from "~~/server/services/credit";
import { enqueueCampaignJob } from "~~/server/services/queue";

async function getCampaignOrFail(id: string, userId: string, role: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id, deletedAt: null },
    include: {
      geoTargets: {
        select: { country: true, weight: true, proxyPoolId: true },
      },
      behaviorProfile: {
        select: {
          id: true,
          customClickEnabled: true,
          customClickTargets: true,
        },
      },
    },
  });

  if (!campaign) {
    throw createError({
      message: "Campaign not found",
      statusCode: 404,
      data: {
        code: "Campaign_NOT_FOUND",
        message: "Campaign not found",
      },
    });
  }

  if (campaign!.userId !== userId && !["admin", "superadmin"].includes(role)) {
    throw createError({
      message: "Access denied",
      statusCode: 403,
      data: {
        code: "FORBIDDEN",
        message: "Access denied",
      },
    });
  }

  return campaign!;
}
export const startCampaign = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event);
    const { user } = session;
    const id = getRouterParam(event, "id")!;

    const campaign = await getCampaignOrFail(
      id,
      user.id,
      user.role?.name ?? "user",
    );

    if (!["draft", "paused", "completed"].includes(campaign.status)) {
      throw createError({
        message: `Campaign cannot be started from status: ${campaign.status}`,
        statusCode: 409,
        data: {
          code: "INVALID_STATUS",
          message: `Campaign cannot be started from status: ${campaign.status}`,
        },
      });
    }

    const hasGeo = campaign.geoTargets.length > 0;
    const estimate = estimateCredits({
      geoEnabled: hasGeo,
      stealthEnabled: true,
    });
    const creditCheck = await checkCreditBalance(user.id, estimate.total);

    if (!creditCheck.sufficient) {
      throw createError({
        message: `Insufficient credit. Need more: ${estimate.total}, Balance: ${creditCheck.balance}`,
        statusCode: 402,
        data: {
          code: "INSUFFICIENT_CREDIT",
          message: `Insufficient credit. Need more: ${estimate.total}, Balance: ${creditCheck.balance}`,
        },
      });
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: "queued", startedAt: new Date(), todayCount: 0 },
    });

    const customClickTargets = campaign.behaviorProfile?.customClickEnabled
      ? ((campaign.behaviorProfile.customClickTargets as any[]) ?? [])
      : [];

    const job = await enqueueCampaignJob({
      campaignId: campaign.id,
      userId: campaign.userId,
      targetUrl: campaign.targetUrl,
      deviceType: campaign.deviceType,
      speedMode: campaign.speedMode,
      minDuration: campaign.minDuration,
      maxDuration: campaign.maxDuration,
      behaviorProfileId: campaign.behaviorProfileId ?? undefined,
      creditsPerSession: estimate.total,
      geoTargets: campaign.geoTargets.map((g) => ({
        country: g.country,
        weight: g.weight,
        proxyPoolId: g.proxyPoolId ?? undefined,
      })),
      customClickTargets,
    });

    if (!job.id) {
      throw createError({
        message: "Failed to enqueue campaign job. Job not found",
        statusCode: 500,
        data: {
          code: "FAILED_TO_ENQUEUE_JOB",
          message: "Failed to enqueue campaign job. Job not found",
        },
      });
    }

    await prisma.$transaction([
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "start_campaign",
          resource: "campaign",
          resourceId: id,
        },
      }),
      prisma.queueJob.create({
        data: {
          queue: "campaign_queue",
          jobId: job.id,
          campaignId: id,
          status: "waiting",
          payload: job.data as any,
        },
      }),
    ]);

    return {
      success: true,
      message: "Campaign dimulai dan masuk ke antrian",
      data: { jobId: job.id, status: "queued" },
    };
  } catch (error) {
    throw handleRequestError(error);
  }
};
export const stopCampaign = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event);
    const { user } = session;
    const id = getRouterParam(event, "id")!;

    const campaign = await getCampaignOrFail(
      id,
      user.id,
      user.role?.name ?? "user",
    );

    if (!["running", "queued", "paused"].includes(campaign.status)) {
      throw createError({
        message: `Campaign is not running or queued or paused: ${campaign.status}`,
        statusCode: 409,
        data: {
          code: "INVALID_STATUS",
          message: `Campaign is not running or queued or paused. Status: ${campaign.status}`,
        },
      });
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: "cancelled", completedAt: new Date() },
    });

    try {
      const { getRedis } = await import("~~/server/services/queue");
      await getRedis().publish(
        `campaign:stop`,
        JSON.stringify({ campaignId: id }),
      );
    } catch (error) {
      console.error("Failed to publish campaign stop message to Redis:", error);
      /* Redis publish may fail, campaign still stopped */
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "stop_campaign",
        resource: "campaign",
        resourceId: id,
      },
    });

    return {
      success: true,
      message: "Campaign stopped",
      data: { status: "cancelled" },
    };
  } catch (error) {
    throw handleRequestError(error);
  }
};
export const pauseCampaign = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event);
    const { user } = session;
    const id = getRouterParam(event, "id")!;

    const campaign = await getCampaignOrFail(
      id,
      user.id,
      user.role?.name ?? "user",
    );

    if (campaign.status !== "running" && campaign.status !== "queued") {
      throw createError({
        message: "Only running/queued campaigns can be paused.",
        statusCode: 409,
        data: {
          code: "INVALID_STATUS",
          message: "Only running/queued campaigns can be paused.",
        },
      });
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: "paused" },
    });

    try {
      const { getRedis } = await import("~~/server/services/queue");
      await getRedis().publish(
        `campaign:pause`,
        JSON.stringify({ campaignId: id }),
      );
    } catch {
      /* silent */
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "pause_campaign",
        resource: "campaign",
        resourceId: id,
      },
    });

    return {
      success: true,
      message: "Campaign paused",
      data: { status: "paused" },
    };
  } catch (error) {
    throw handleRequestError(error);
  }
};
export const getById = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event);
    const { user } = session;
    const id = getRouterParam(event, "id")!;

    const campaign = await prisma.campaign.findUnique({
      where: { id, deletedAt: null },
      include: {
        geoTargets: true,
        behaviorProfile: true,
        _count: {
          select: { sessions: true, analyticsEvents: true },
        },
      },
    });

    if (!campaign)
      throw createError({
        statusCode: 404,
        message: "Campaign not found",
        data: {
          code: "NOT_FOUND",
          message: "Campaign not found",
        },
      });

    // Only owner or admin can view
    if (
      campaign!.userId !== user.id &&
      !["admin", "superadmin"].includes(user.role.name)
    ) {
      throw createError({
        statusCode: 403,
        message: "Access denied",
        data: {
          code: "FORBIDDEN",
          message: "Access denied",
        },
      });
    }

    return {
      success: true,
      message: "OK",
      data: {
        ...campaign,
        sessionCount: campaign!._count.sessions,
        eventCount: campaign!._count.analyticsEvents,
        _count: undefined,
      },
    };
  } catch (error) {
    throw handleRequestError(error);
  }
};
export const updateById = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event);
    const { user } = session;
    const id = getRouterParam(event, "id")!;

    const campaign = await prisma.campaign.findUnique({
      where: { id, deletedAt: null },
      select: { userId: true, status: true },
    });

    if (!campaign)
      throw createError({
        statusCode: 404,
        message: "Campaign not found",
        data: {
          code: "NOT_FOUND",
          message: "Campaign not found",
        },
      });
    if (
      campaign!.userId !== user.id &&
      !["admin", "superadmin"].includes(user.role.name)
    ) {
      throw createError({
        statusCode: 403,
        message: "Access denied",
        data: {
          code: "FORBIDDEN",
          message: "Access denied",
        },
      });
    }
    if (campaign!.status === "running") {
      throw createError({
        statusCode: 409,
        message: "Pause campaign before editing",
        data: {
          code: "PAUSED",
          message: "Pause campaign before editing",
        },
      });
    }

    const body = await readBody(event);
    const parsed = updateCampaignSchema.safeParse(body);
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        message: "Validation error",
        data: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues.map((i) => i.message).join(", "),
        },
      });
    }
    const data = parsed.data!;

    const updated = await prisma.$transaction(async (tx) => {
      // Update geo targets jika ada
      if (data.geoTargets !== undefined) {
        await tx.campaignGeoTarget.deleteMany({ where: { campaignId: id } });
        if (data.geoTargets.length > 0) {
          await tx.campaignGeoTarget.createMany({
            data: data.geoTargets.map((g) => ({
              campaignId: id,
              country: g.country,
              weight: g.weight,
              proxyPoolId: g.proxyPoolId ?? null,
            })),
          });
        }
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "update_campaign",
          resource: "campaign",
          resourceId: id,
          newValue: data as any,
        },
      });

      return tx.campaign.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.targetUrl !== undefined && { targetUrl: data.targetUrl }),
          ...(data.dailyLimit !== undefined && { dailyLimit: data.dailyLimit }),
          ...(data.totalLimit !== undefined && { totalLimit: data.totalLimit }),
          ...(data.maxConcurrent !== undefined && {
            maxConcurrent: data.maxConcurrent,
          }),
          ...(data.speedMode !== undefined && { speedMode: data.speedMode }),
          ...(data.deviceType !== undefined && { deviceType: data.deviceType }),
          ...(data.geoMode !== undefined && { geoMode: data.geoMode }),
          ...(data.behaviorProfileId !== undefined && {
            behaviorProfileId: data.behaviorProfileId,
          }),
          ...(data.minDuration !== undefined && {
            minDuration: data.minDuration,
          }),
          ...(data.maxDuration !== undefined && {
            maxDuration: data.maxDuration,
          }),
          ...(data.bounceRate !== undefined && { bounceRate: data.bounceRate }),
          ...(data.scheduleEnabled !== undefined && {
            scheduleEnabled: data.scheduleEnabled,
          }),
          ...(data.scheduleStart !== undefined && {
            scheduleStart: data.scheduleStart,
          }),
          ...(data.scheduleEnd !== undefined && {
            scheduleEnd: data.scheduleEnd,
          }),
          ...(data.scheduleDays !== undefined && {
            scheduleDays: data.scheduleDays,
          }),
          ...(data.timezone !== undefined && { timezone: data.timezone }),
          ...(data.webhookUrl !== undefined && { webhookUrl: data.webhookUrl }),
          ...(data.webhookEnabled !== undefined && {
            webhookEnabled: data.webhookEnabled,
          }),
        },
        include: {
          geoTargets: { select: { country: true, weight: true } },
          behaviorProfile: { select: { id: true, name: true } },
        },
      });
    });

    return {
      success: true,
      message: "Campaign updated successfully",
      data: updated,
    };
  } catch (error) {
    throw handleRequestError(error);
  }
};
export const listCampaign = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event);
    const { user } = session;
    // console.log(user);

    // Parse & validate query params
    const rawQuery = getQuery(event);
    const query = listCampaignQuerySchema.parse({
      page: rawQuery.page,
      limit: rawQuery.limit,
      status: rawQuery.status,
      search: rawQuery.search,
      orderBy: rawQuery.orderBy,
      order: rawQuery.order,
    });

    const skip = (query.page - 1) * query.limit;

    // Build where clause
    const where: any = {
      deletedAt: null,
    };

    // Admin bisa lihat semua, user hanya punyanya sendiri
    const roleName = user.role?.name ?? "user";
    if (!["admin", "superadmin"].includes(roleName)) {
      const userIdStr = String(user.id ?? "");

      // UUID validation
      const UUID_REGEX =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const CUID_REGEX = /^c[a-z0-9]{24}$/;

      if (!UUID_REGEX.test(userIdStr)) {
        // Likely a corrupted or CUID-based session ID
        console.error("[listCampaign] Invalid user.id format:", userIdStr);
        throw createError({
          statusCode: 401,
          message: "Invalid session",
          data: {
            code: "INVALID_SESSION",
            message: "Session corrupted. Please logout and login again.",
          },
        });
      }

      where.userId = userIdStr;
    }

    if (query.status) where.status = query.status;
    if (query.search)
      where.name = { contains: query.search, mode: "insensitive" };

    // Build orderBy
    const orderBy: any = { [query.orderBy]: query.order };

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: query.limit,
        orderBy,
        include: {
          geoTargets: {
            select: { country: true, weight: true },
          },
          behaviorProfile: {
            select: { id: true, name: true },
          },
          _count: {
            select: { sessions: true },
          },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    return {
      success: true,
      message: "OK",
      data: {
        campaigns: campaigns.map((c) => ({
          ...c,
          sessionCount: c._count.sessions,
          _count: undefined,
        })),
      },
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  } catch (error) {
    throw handleRequestError(error);
  }
};
export const createCampaign = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event);
    const { user } = session;

    const body = await readBody(event);

    // Validate input
    const parsed = createCampaignSchema.safeParse(body);
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        message:
          parsed.error.issues.map((issue) => issue.message).join(", ") ??
          "Invalid input",
        data: {
          code: "INVALID_INPUT",
          message: parsed.error.issues.map((issue) => issue.message).join(", "),
        },
      });
    }
    const data = parsed.data!;

    // Check subscription aktif
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { isActive: true, plan: true, creditBalance: true },
    });

    if (!subscription?.isActive) {
      throw createError({
        statusCode: 403,
        message: "Subscription not active",
        data: {
          code: "NO_SUBSCRIPTION",
          message: "Subscription not active",
        },
      });
    }

    // Check campaign limit per plan
    const campaignCount = await prisma.campaign.count({
      where: { userId: user.id, deletedAt: null },
    });

    const planLimits: Record<string, number> = {
      free: 2,
      starter: 10,
      pro: 50,
      enterprise: 999,
    };
    const maxCampaigns = planLimits[subscription!.plan] ?? 2;

    if (campaignCount >= maxCampaigns) {
      throw createError({
        statusCode: 403,
        message: `Plan ${subscription!.plan} can only create ${maxCampaigns} campaign. Upgrade to create more.`,
        data: {
          code: "CAMPAIGN_LIMIT",
          message: `Plan ${subscription!.plan} can only create ${maxCampaigns} campaign. Upgrade to create more.`,
        },
      });
    }

    // Estimate credit per session
    const hasGeo = data.geoTargets.length > 0;
    const creditEstimate = estimateCredits({
      geoEnabled: hasGeo,
      stealthEnabled: true,
      sessionMode: "ephemeral",
    });

    // Cek apakah punya cukup credit untuk minimal 1 session
    const creditCheck = await checkCreditBalance(user.id, creditEstimate.total);
    if (!creditCheck.sufficient) {
      throw createError({
        statusCode: 402,
        message: `Credit insufficient. Need ${creditEstimate.total} credit, balance is: ${creditCheck.balance}`,
        data: {
          code: "INSUFFICIENT_CREDIT",
          message: `Credit insufficient. Need ${creditEstimate.total} credit, balance is: ${creditCheck.balance}`,
        },
      });
    }

    // Validate behaviorProfileId jika ada
    if (data.behaviorProfileId) {
      const profile = await prisma.behaviorProfile.findUnique({
        where: { id: data.behaviorProfileId },
      });
      if (!profile) {
        throw createError({
          statusCode: 404,
          message: "Behavior profile not found",
          data: {
            code: "PROFILE_NOT_FOUND",
            message: "Behavior profile not found",
          },
        });
      }
    }

    // Create campaign + geoTargets in transaction
    const campaign = await prisma.$transaction(async (tx) => {
      const newCampaign = await tx.campaign.create({
        data: {
          userId: user.id,
          name: data.name,
          description: data.description ?? null,
          targetUrl: data.targetUrl,
          status: "draft",
          dailyLimit: data.dailyLimit,
          totalLimit: data.totalLimit ?? null,
          maxConcurrent: data.maxConcurrent,
          speedMode: data.speedMode,
          deviceType: data.deviceType,
          geoMode: data.geoMode,
          behaviorProfileId: data.behaviorProfileId ?? null,
          minDuration: data.minDuration,
          maxDuration: data.maxDuration,
          bounceRate: data.bounceRate,
          scheduleEnabled: data.scheduleEnabled,
          scheduleStart: data.scheduleStart ?? null,
          scheduleEnd: data.scheduleEnd ?? null,
          scheduleDays: data.scheduleDays,
          timezone: data.timezone,
          webhookUrl: data.webhookUrl ?? null,
          webhookEnabled: data.webhookEnabled,
        },
      });

      // Create geo targets
      if (data.geoTargets.length > 0) {
        await tx.campaignGeoTarget.createMany({
          data: data.geoTargets.map((g) => ({
            campaignId: newCampaign.id,
            country: g.country,
            weight: g.weight,
            proxyPoolId: g.proxyPoolId ?? null,
          })),
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "create_campaign",
          resource: "campaign",
          resourceId: newCampaign.id,
          newValue: { name: data.name, targetUrl: data.targetUrl },
        },
      });

      return newCampaign;
    });

    // Fetch full campaign with relations
    const fullCampaign = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      include: {
        geoTargets: { select: { country: true, weight: true } },
        behaviorProfile: { select: { id: true, name: true } },
      },
    });

    return {
      success: true,
      message: "Campaign berhasil dibuat",
      data: {
        campaign: fullCampaign,
        creditEstimate,
      },
    };
  } catch (error) {
    throw handleRequestError(error);
  }
};
export const deleteCampaign = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event);
    const { user } = session;
    const id = getRouterParam(event, "id")!;

    const campaign = await prisma.campaign.findUnique({
      where: { id, deletedAt: null },
      select: { userId: true, status: true, name: true },
    });

    if (!campaign) {
      throw createError({
        statusCode: 404,
        message: "Campaign not found",
        data: {
          code: "CAMPAIGN_NOT_FOUND",
          message: "Campaign not found",
        },
      });
    }
    if (
      campaign!.userId !== user.id &&
      !["admin", "superadmin"].includes(user.role.name)
    ) {
      throw createError({
        statusCode: 403,
        message: "Access denied",
        data: {
          code: "FORBIDDEN",
          message: "Access denied",
        },
      });
    }
    if (campaign!.status === "running") {
      throw createError({
        statusCode: 409,
        message: "Campaign running, please stop it first",
        data: {
          code: "CAMPAIGN_RUNNING",
          message: "Campaign running, please stop it first",
        },
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.campaign.update({
        where: { id },
        data: { deletedAt: new Date(), status: "cancelled" },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "delete_campaign",
          resource: "campaign",
          resourceId: id,
          oldValue: { name: campaign!.name, status: campaign!.status },
        },
      });
    });

    return {
      success: true,
      message: "Campaign deleted successfully!",
      data: null,
    };
  } catch (error) {
    throw handleRequestError(error);
  }
};

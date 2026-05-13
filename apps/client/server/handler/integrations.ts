import { type H3Event } from "h3";
import { AntidetectProviderFactory } from "@forge-exchange/antidetect/server";
import type {
  ProviderCredentials,
  ProviderType,
} from "@forge-exchange/antidetect/server";

const integrationSelect = {
  id: true,
  type: true,
  name: true,
  isActive: true,
  isHealthy: true,
  lastTestedAt: true,
  createdAt: true,
} as const;

export const listIntegration = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session

    const raw = getQuery(event)
    const query = listIntegrationQuerySchema.parse(raw)

    const skip = (query.page - 1) * query.limit
    const where: Record<string, any> | undefined = {
      userId: user.id,
    }
    if (query.status) {
      where.isActive = query.status === 'active'
    }
    if (query.type) {
      where.type = query.type
    }
    if (query.isHealthy !== undefined) {
      where.isHealthy = query.isHealthy
    }
    if (query.lastTestedAt) {
      where.lastTestedAt = query.lastTestedAt
    }
    if (query.search) {
      where.name = {
        contains: query.search,
        mode: 'insensitive',
      }
    }

    const [integrations, total] = await prisma.$transaction(async (tx) => {
      const integrations = await tx.integration.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ createdAt: "desc" }],
        select: integrationSelect,
      })
      const total = await tx.integration.count({
        where,
      })
      return [integrations, total]
    })
    return {
      success: true,
      message: 'OK',
      data: {
        integrations,
        stats: { active: integrations.filter(i => i.isActive).length, total },
      },
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    }
  } catch (error) {
    throw handleRequestError(error);
  }
}
export const testProvider = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session
    const id = getRouterParam(event, 'id')!

    const integration = await prisma.integration.findUnique({
      where: { id },
      select: { id: true, userId: true, type: true, credentials: true, isActive: true },
    })

    if (!integration) {
      throw createError({
        statusCode: 404,
        message: 'Integration not found',
        data: {
          code: 'NOT_FOUND',
        }
      })
    }
    if (integration!.userId !== user.id) {
      throw createError({
        statusCode: 403,
        message: 'Access denied',
        data: {
          code: 'FORBIDDEN',
        }
      })
    }

    const providerType = integration!.type as ProviderType

    if (!AntidetectProviderFactory.isSupported(providerType)) {
      await prisma.integration.update({
        where: { id },
        data: {
          isHealthy: true,
          lastTestedAt: new Date(),
        },
      })
      return {
        success: true,
        message: 'Integration type does not require a connection test',
        data: { healthy: true },
      }
    }

    // Build credentials dari DB
    const creds = integration!.credentials as Record<string, any>
    const credentials: ProviderCredentials = {
      apiKey: creds.apiKey ?? creds.token ?? undefined,
      apiUrl: creds.apiUrl ?? undefined,
      email: creds.email ?? undefined,
      password: creds.password ?? undefined,
      apiPort: creds.apiPort ? Number(creds.apiPort) : undefined,
    }

    // Create provider dan health check
    const provider = AntidetectProviderFactory.create(providerType, credentials)
    const result = await provider.healthCheck()

    // Update health status di DB
    await prisma.integration.update({
      where: { id },
      data: {
        isHealthy: result.healthy,
        lastTestedAt: new Date(),
      },
    })

    return {
      success: true,
      message: result.healthy
        ? `Connection successful: ${result.message}`
        : `Connection failed: ${result.message}`,
      data: result,
    }
  } catch (error) {
    throw handleRequestError(error);
  }
}

const PREVIEW_ALLOWLIST = new Set([
  "username",
  "host",
  "port",
  "rotateUrl",
  "proxyType",
  "rotationInterval",
  "apiUrl",
  "apiPort",
  "workspaceId",
  "solverType",
  "email",
]);

function maskValue(value: unknown) {
  if (typeof value !== "string") return value;
  const v = value.trim();
  if (!v) return v;
  if (v.includes("@")) {
    const [name, domain] = v.split("@");
    const head = (name ?? "").slice(0, 2);
    return `${head}***@${domain ?? ""}`;
  }
  if (v.length <= 4) return "***";
  return `${v.slice(0, 2)}***${v.slice(-2)}`;
}

export const getIntegrationPreview = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event);
    const { user } = session;
    const id = getRouterParam(event, "id")!;

    const integration = await prisma.integration.findUnique({
      where: { id },
      select: { id: true, userId: true, type: true, name: true, credentials: true },
    });

    if (!integration) {
      throw createError({
        statusCode: 404,
        message: "Integration not found",
        data: { code: "NOT_FOUND" },
      });
    }
    if (integration.userId !== user.id) {
      throw createError({
        statusCode: 403,
        message: "Access denied",
        data: { code: "FORBIDDEN" },
      });
    }

    const creds = (integration.credentials as Record<string, any>) ?? {};
    const preview: Record<string, any> = {};
    const secretFlags: Record<string, boolean> = {
      apiKey: typeof creds.apiKey === "string" ? !!creds.apiKey.trim() : !!creds.apiKey,
      password:
        typeof creds.password === "string" ? !!creds.password.trim() : !!creds.password,
      token: typeof creds.token === "string" ? !!creds.token.trim() : !!creds.token,
    };

    for (const [k, v] of Object.entries(creds)) {
      if (!PREVIEW_ALLOWLIST.has(k)) continue;
      preview[k] = k === "email" || k === "username" ? maskValue(v) : v;
    }

    return {
      success: true,
      message: "OK",
      data: {
        id: integration.id,
        type: integration.type,
        name: integration.name,
        credentials: preview,
        secretFlags,
      },
    };
  } catch (error) {
    throw handleRequestError(error);
  }
};
export const updateIntegration = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session
    const id = getRouterParam(event, 'id')!
    const parsed = updateIntegrationSchema.safeParse(await readBody(event))
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        message: 'Invalid request body',
        data: {
          code: 'BAD_REQUEST',
          message: parsed.error.issues.map((i) => i.message).join(', '),
        }
      })
    }
    const body = parsed.data

    // Cek ownership
    const integration = await prisma.integration.findUnique({
      where: { id },
      select: { id: true, userId: true, type: true },
    })

    if (!integration) {
      throw createError({ statusCode: 404, message: 'Integration not found', data: { code: 'NOT_FOUND' } })
    }
    if (integration.userId !== user.id) {
      throw createError({ statusCode: 403, message: 'Access denied', data: { code: 'FORBIDDEN' } })
    }

    // Build update payload
    const updateData: Record<string, any> = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.credentials !== undefined) {
      // Hanya update field yang diisi (tidak kosong) — jaga credentials lama
      const existing = await prisma.integration.findUnique({
        where: { id },
        select: { credentials: true },
      })
      const existingCreds = (existing?.credentials as Record<string, any>) ?? {}
      const newCreds = body.credentials as Record<string, any>

      // Merge: field baru override lama, field kosong diabaikan
      const mergedCreds = { ...existingCreds }
      for (const [k, v] of Object.entries(newCreds)) {
        if (v !== '' && v !== null && v !== undefined) {
          mergedCreds[k] = v
        }
      }
      updateData.credentials = mergedCreds
      // Reset health status karena credentials berubah
      updateData.isHealthy = null
      updateData.lastTestedAt = null
    }

    const updated = await prisma.integration.update({
      where: { id },
      data: updateData,
      select: integrationSelect,
    })

    return {
      success: true,
      message: 'Integration successfully updated',
      data: { integration: updated },
    }
  } catch (error) {
    throw handleRequestError(error)
  }
}
export const createIntegration = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session
    const body = createIntegrationsSchema.safeParse(await readBody(event))
    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: 'Invalid request body',
        data: {
          code: 'BAD_REQUEST',
          message: body.error.issues.map((i) => i.message).join(', '),
        }
      })
    }

    const exist = await prisma.integration.findFirst({
      where: {
        userId: user.id,
        type: body.data.type,
      },
      select: { id: true },
    })

    const cleanedCreds: Record<string, any> = {}
    for (const [k, v] of Object.entries(body.data.credentials as any)) {
      if (v === '' || v === null || v === undefined) continue
      cleanedCreds[k] = v
    }

    const integration = exist
      ? await prisma.integration.update({
          where: { id: exist.id },
          data: {
            name: body.data.name,
            isActive: body.data.isActive,
            credentials: cleanedCreds,
            config: body.data.config as any,
            isHealthy: null,
            lastTestedAt: null,
          },
          select: integrationSelect,
        })
      : await prisma.integration.create({
          data: {
            userId: user.id,
            type: body.data.type,
            name: body.data.name,
            isActive: body.data.isActive,
            credentials: cleanedCreds,
            config: body.data.config as any,
            isHealthy: null,
            lastTestedAt: null,
          },
          select: integrationSelect,
        })

    return {
      success: true,
      message: exist ? 'Integration successfully updated' : 'Integration successfully created',
      data: { integration },
    }
  } catch (error) {
    throw handleRequestError(error)
  }
}
export const deleteIntegration = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session
    const id = getRouterParam(event, 'id')!
    await prisma.integration.deleteMany({
      where: { id, userId: user.id },
    });
    return {
      success: true,
      message: 'Integration successfully deleted',
    }
  } catch (error) {
    throw handleRequestError(error)
  }
}

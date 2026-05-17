import { type H3Event } from "h3";
import type { TopUpTransaction, Subscription } from "@forge-exchange/db"

export const listTransactions = async (event: H3Event) => {
  try {
    await requireAdmin(event)

    const raw = getQuery(event)
    const query = listTransactionQuerySchema.parse(raw)
    const skip = (query.page - 1) * query.limit


    let transactions: TopUpTransaction[] = []
    let subscriptions: Subscription[] = []
    let total: number = 0

    const where: any = {}

    if (query.type === 'topUp') {
      if (query.gateway) where.gateway = query.gateway
      if (query.status) where.status = query.status
      if (query.search) where.OR = [
        { gatewayRef: { contains: query.search, mode: 'insensitive' } },
        { type: { contains: query.type, mode: 'insensitive' } },
        { userId: { contains: query.search, mode: 'insensitive' } },
      ]

      const [trans, totalTsc] = await Promise.all([
        prisma.topUpTransaction.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: true,
          }
        }),
        prisma.topUpTransaction.count({ where }),
      ])

      transactions = trans
      total = totalTsc
    } else if (query.type === 'subscription') {
      if (query.gateway) where.gateway = query.gateway
      if (query.status) where.status = query.status
      if (query.isActive) where.isActive = query.isActive
      if (query.search) where.OR = [
        { plan: { contains: query.plan, mode: 'insensitive' } },
        { userId: { contains: query.search, mode: 'insensitive' } },
      ]

      const [trans, totalSub] = await Promise.all([
        prisma.subscription.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: true,
          }
        }),
        prisma.subscription.count({ where }),
      ])

      subscriptions = trans
      total = totalSub
    }

    return {
      success: true,
      message: 'OK',
      data: {
        type: query.type,
        transactions: transactions.map(t => ({
          ...t,
          amountIdr: Number(t.amountIdr),
          creditsPurchased: Number(t.creditsPurchased),
        })),
        subscriptions,
      },
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    }
  } catch (error) {
    throw handleRequestError(error)
  }
}
export const bulkDeleteTransaction = async (event: H3Event) => {
  try {
    await requireAdmin(event)

    const body = bulkDeleteTransactionSchema.safeParse(await readBody(event))
    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: body.error.issues.map(i => i.message).join(', '),
      })
    }

    if (body.data.type === 'topUp') {
      await prisma.topUpTransaction.deleteMany({
        where: {
          id: {
            in: body.data.ids,
          },
        },
      })
    } else if (body.data.type === 'subscription') {
      await prisma.subscription.deleteMany({
        where: {
          id: {
            in: body.data.ids,
          },
        },
      })
    }

    return {
      success: true,
      message: 'OK',
    }
  } catch (error) {
    throw handleRequestError(error)
  }
}
export const deleteTransaction = async (event: H3Event) => {
  try {
    await requireAdmin(event)

    const id = getRouterParam(event, "id")!;
    const type = getQuery(event).type! as string
      ;
    if (type === 'topUp') {
      await prisma.topUpTransaction.delete({
        where: {
          id,
        },
      })
    } else if (type === 'subscription') {
      await prisma.subscription.delete({
        where: {
          id,
        },
      })
    }
    return {
      success: true,
      message: 'OK',
    }
  } catch (error) {
    throw handleRequestError(error)
  }
}

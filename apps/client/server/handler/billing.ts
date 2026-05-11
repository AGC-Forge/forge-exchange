import { type H3Event } from "h3";
import crypto from 'crypto'
import {
  createMidtransTransaction,
  createXenditInvoice,
  calculateCredits,
  fulfillTopUp
} from '~~/server/services/billing'

export const subscriptions = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session

    const [subscription, creditUsedToday, totalTransactions] = await Promise.all([
      prisma.subscription.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          plan: true,
          creditLimit: true,
          creditBalance: true,
          creditUsed: true,
          isActive: true,
          startedAt: true,
          expiredAt: true,
        },
      }),

      // Credit used hari ini
      prisma.creditLog.aggregate({
        where: {
          userId: user.id,
          type: 'debit',
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        _sum: { amount: true },
      }),

      // Total transaksi berhasil
      prisma.topUpTransaction.count({
        where: { userId: user.id, status: 'paid' },
      }),
    ])

    if (!subscription) {
      throw createError({
        statusCode: 404,
        message: 'Subscription not found',
        data: {
          code: "NOT_FOUND",
          message: "Subscription not found",
        }
      })
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.plan)

    return {
      success: true,
      message: 'OK',
      data: {
        subscription: {
          ...subscription,
          creditLimit: Number(subscription.creditLimit),
          creditBalance: Number(subscription.creditBalance),
          creditUsed: Number(subscription.creditUsed),
          creditUsedToday: creditUsedToday._sum.amount ?? 0,
        },
        plan,
        totalTransactions,
        packages: CREDIT_PACKAGES,
        plans: SUBSCRIPTION_PLANS,
      },
    }
  } catch (error) {
    throw handleRequestError(error)
  }
}
export const histories = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session

    const raw = getQuery(event)
    const query = creditLogQuerySchema.parse(raw)
    const skip = (query.page - 1) * query.limit

    const where: any = { userId: user.id }
    if (query.type) where.type = query.type

    const [logs, total] = await Promise.all([
      prisma.creditLog.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          type: true,
          source: true,
          description: true,
          balanceBefore: true,
          balanceAfter: true,
          createdAt: true,
        },
      }),
      prisma.creditLog.count({ where }),
    ])

    return {
      success: true,
      message: 'OK',
      data: {
        logs: logs.map(l => ({
          ...l,
          balanceBefore: Number(l.balanceBefore),
          balanceAfter: Number(l.balanceAfter),
        })),
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
export const topUp = async (event: H3Event) => {
  const session = await requireUserSession(event)
  const { user } = session

  const body = await readBody(event)
  const parsed = topUpSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues.map(i => i.message).join(', ') ?? 'Input tidak valid',
    })
  }
  const { amount, gateway } = parsed.data!

  const creditsPurchased = calculateCredits(amount)

  // Fetch user data untuk gateway
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, name: true },
  })

  if (!dbUser) throw createError({
    statusCode: 404,
    message: 'User not found',
    data: {
      code: 'USER_NOT_FOUND',
    }
  })

  // Create transaction record dulu (status: pending)
  const transaction = await prisma.topUpTransaction.create({
    data: {
      userId: user.id,
      amountIdr: BigInt(amount),
      creditsPurchased: BigInt(creditsPurchased),
      gateway,
      status: 'pending',
      expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 jam
    },
  })

  try {
    let paymentUrl: string
    let gatewayRef: string

    if (gateway === 'midtrans') {
      const result = await createMidtransTransaction({
        userId: user.id,
        transactionId: transaction.id,
        amountIdr: amount,
        creditsPurchased,
        userEmail: dbUser!.email,
        userName: dbUser!.name ?? 'User',
      })
      paymentUrl = result.paymentUrl
      gatewayRef = result.token
    } else {
      const result = await createXenditInvoice({
        userId: user.id,
        transactionId: transaction.id,
        amountIdr: amount,
        creditsPurchased,
        userEmail: dbUser!.email,
      })
      paymentUrl = result.paymentUrl
      gatewayRef = result.invoiceId
    }

    // Update transaction dengan gateway ref
    await prisma.topUpTransaction.update({
      where: { id: transaction.id },
      data: { gatewayRef },
    })

    return {
      success: true,
      message: 'Transaksi dibuat. Silakan selesaikan pembayaran.',
      data: {
        transactionId: transaction.id,
        amountIdr: amount,
        creditsPurchased,
        gateway,
        paymentUrl,
        expiredAt: transaction.expiredAt,
      },
    }
  } catch (err) {
    // Jika gateway error, mark transaction sebagai failed
    await prisma.topUpTransaction.update({
      where: { id: transaction.id },
      data: { status: 'failed' },
    })
    const errMsg = err instanceof H3Error ? err.message : err
    throw createError({
      statusCode: 502,
      statusMessage: `Payment gateway error: ${errMsg}`,
      data: {
        code: 'GATEWAY_ERROR',
      }
    })
  }
}
export const handleMidtrans = async (event: H3Event) => {
  const body = await readBody(event)
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? ''

  // Verify signature
  const signatureStr = `${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`
  const expectedSig = crypto.createHash('sha512').update(signatureStr).digest('hex')

  if (body.signature_key !== expectedSig) {
    throw createError({ statusCode: 401, message: 'Invalid Midtrans signature' })
  }

  const transactionId = body.order_id
  const txStatus = body.transaction_status
  const fraudStatus = body.fraud_status

  const isPaid =
    (txStatus === 'capture' && fraudStatus === 'accept') ||
    txStatus === 'settlement'

  const isFailed =
    txStatus === 'cancel' ||
    txStatus === 'deny' ||
    txStatus === 'expire' ||
    (txStatus === 'capture' && fraudStatus === 'deny')

  if (isPaid) {
    await fulfillTopUp(transactionId)
  } else if (isFailed) {
    await prisma.topUpTransaction.update({
      where: { id: transactionId },
      data: { status: 'failed' },
    }).catch(() => { })
  }

  return { success: true, message: 'OK' }
}
export const handleXendit = async (event: H3Event) => {
  const headers = getHeaders(event)
  const body = await readBody(event)
  const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN ?? ''
  const callbackToken = headers['x-callback-token']!

  if (callbackToken !== expectedToken) {
    throw createError({ statusCode: 401, message: 'Invalid Xendit token' })
  }

  const transactionId = body.external_id
  const status = body.status

  if (status === 'PAID' || status === 'SETTLED') {
    await fulfillTopUp(transactionId)
  } else if (status === 'EXPIRED') {
    await prisma.topUpTransaction.update({
      where: { id: transactionId },
      data: { status: 'expired' },
    }).catch(() => { })
  }

  return { success: true, message: 'OK' }
}
export const transactions = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session

    const raw = getQuery(event)
    const page = Math.max(1, Number(raw.page ?? 1))
    const limit = Math.min(50, Math.max(1, Number(raw.limit ?? 10)))
    const skip = (page - 1) * limit

    const [transactions, total] = await Promise.all([
      prisma.topUpTransaction.findMany({
        where: { userId: user.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amountIdr: true,
          creditsPurchased: true,
          gateway: true,
          gatewayRef: true,
          status: true,
          paidAt: true,
          expiredAt: true,
          createdAt: true,
        },
      }),
      prisma.topUpTransaction.count({ where: { userId: user.id } }),
    ])

    return {
      success: true,
      message: 'OK',
      data: {
        transactions: transactions.map(t => ({
          ...t,
          amountIdr: Number(t.amountIdr),
          creditsPurchased: Number(t.creditsPurchased),
        })),
      },
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    throw handleRequestError(error)
  }
}

import { type H3Event } from "h3";
import crypto from 'crypto'
import {
  createMidtransTransaction,
  createXenditInvoice,
  calculateCredits,
  fulfillTopUp,
  fulfillSubscription
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
        userName: dbUser!.name ?? 'User',
        transactionId: transaction.id,
        amountIdr: amount,
        creditsPurchased,
        userEmail: dbUser!.email,
      })
      paymentUrl = result.paymentUrl
      gatewayRef = result.invoiceId
    }

    await prisma.topUpTransaction.update({
      where: { id: transaction.id },
      data: {
        gatewayRef,
        paymentUrl,
        externalId: transaction.id,
      },
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

  if (isPaid) {
    // Lookup transaction untuk tahu type-nya
    const txRecord = await prisma.topUpTransaction.findUnique({
      where: { id: transactionId },
      select: { id: true, type: true },
    })

    if (txRecord) {
      if (txRecord.type === 'subscription') {
        await fulfillSubscription(transactionId)
      } else {
        await fulfillTopUp(transactionId)
      }
    }
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
    const txRecord = await prisma.topUpTransaction.findFirst({
      where: { externalId: transactionId },
      select: { id: true, type: true },
    })

    if (txRecord) {
      if (txRecord.type === 'subscription') {
        await fulfillSubscription(txRecord.id)
      } else {
        await fulfillTopUp(txRecord.id)
      }
    }
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
export const createSubscription = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session

    const body = await readBody(event)
    const { planId, gateway, billingCycle = 'monthly' } = body as {
      planId: string
      gateway: 'midtrans' | 'xendit'
      billingCycle: 'monthly' | 'yearly'
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId)
    if (!plan || planId === 'free' || planId === 'enterprise') {
      throw createError({
        statusCode: 400,
        message: 'Invalid plan',
        data: { code: 'INVALID_PLAN' },
      })
    }

    const basePrice = plan.price
    const finalPrice = billingCycle === 'yearly'
      ? Math.round(basePrice * 12 * 0.80)  // 20% discount yearly
      : basePrice

    if (finalPrice <= 0) {
      throw createError({
        statusCode: 400,
        message: 'Invalid plan price',
        data: {
          code: 'INVALID_PRICE'
        }
      })
    }

    // Cek apakah sudah ada pending transaction untuk plan ini
    const existingPending = await prisma.topUpTransaction.findFirst({
      where: {
        userId: user.id,
        status: 'pending',
        metadata: { path: ['planId'], equals: planId },
      },
      select: { id: true, paymentUrl: true },
    })
    if (existingPending?.paymentUrl) {
      // Return existing payment URL agar tidak buat transaction ganda
      return {
        status: 200, success: true,
        message: 'Pending order already exists — redirect to payment page',
        data: {
          paymentUrl: existingPending.paymentUrl
        },
      }
    }

    // Fetch user data lengkap
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, name: true },
    })
    if (!userData) throw createError({
      statusCode: 404,
      message: 'User not found',
      data: { code: 'USER_NOT_FOUND' }
    })

    // Buat transaction record dulu (status: pending)
    const creditsGranted = billingCycle === 'yearly' ? plan.credits * 12 : plan.credits
    const transaction = await prisma.topUpTransaction.create({
      data: {
        userId: user.id,
        amountIdr: finalPrice,
        creditsPurchased: creditsGranted,
        gateway,
        status: 'pending',
        type: 'subscription',      // bedain dari topup biasa
        metadata: {
          planId,
          billingCycle,
          planName: plan.name,
          basePrice,
          finalPrice,
          creditsGranted,
        },
      },
      select: { id: true },
    })

    // Buat payment di gateway
    let paymentUrl: string
    let gatewayRef: string


    if (gateway === 'midtrans') {
      const result = await createMidtransTransaction({
        userId: user.id,
        transactionId: transaction.id,
        amountIdr: finalPrice,
        creditsPurchased: creditsGranted,
        userEmail: userData.email,
        userName: userData.name ?? '',
        description: `TrafficX ${plan.name} Plan (${billingCycle})`,
      })
      paymentUrl = result.paymentUrl
      gatewayRef = result.token
    } else {
      const result = await createXenditInvoice({
        userId: user.id,
        transactionId: transaction.id,
        amountIdr: finalPrice,
        creditsPurchased: creditsGranted,
        userEmail: userData.email,
        userName: userData.name ?? '',
        description: `TrafficX ${plan.name} Plan (${billingCycle})`,
      })
      paymentUrl = result.paymentUrl
      gatewayRef = result.invoiceId ?? transaction.id
    }

    // Update transaction dengan paymentUrl + externalId
    await prisma.topUpTransaction.update({
      where: { id: transaction.id },
      data: {
        paymentUrl,
        gatewayRef,
        externalId: transaction.id,
      },
    })

    setResponseStatus(event, 201)
    setSecurityHeaders(event)
    return {
      success: true,
      message: `Order berhasil dibuat — silakan selesaikan pembayaran`,
      data: {
        transactionId: transaction.id,
        paymentUrl,
        planId,
        billingCycle,
        finalPrice,
        creditsGranted,
      },
    }
  } catch (error) {
    throw handleRequestError(error)
  }
}

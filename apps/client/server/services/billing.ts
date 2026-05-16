
import type { User } from "@forge-exchange/db"
import {
  Client,
  Environment,
  LogLevel,
  OrdersController,
  CheckoutPaymentIntent,
  type OrderRequest,
} from '@paypal/paypal-server-sdk';

export function calculateCredits(amountIdr: number): number {
  const BASE_RATE = 5
  const pkg = [...CREDIT_PACKAGES].reverse().find(p => amountIdr >= p.priceIdr)
  return pkg ? pkg.credits + pkg.bonus : Math.floor(amountIdr / BASE_RATE)
}

export async function createMidtransTransaction(opts: {
  user: User,
  transactionId: string
  amountIdr: number
  creditsPurchased: number
  plan?: string,
  renewedAt?: Date,
  description?: string
}): Promise<{ paymentUrl: string; token: string }> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY
  if (!serverKey) throw new Error('MIDTRANS_SERVER_KEY not configured')

  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  const baseUrl = isProduction
    ? 'https://app.midtrans.com'
    : 'https://app.sandbox.midtrans.com'

  const itemName = opts.description
    ?? `${opts.creditsPurchased.toLocaleString()} Credits — Smart Boost Labs`

  const payload = {
    transaction_details: {
      order_id: opts.transactionId,
      gross_amount: opts.amountIdr,
    },
    customer_details: {
      email: opts.user.email,
      first_name: opts.user.name || 'User',
    },
    item_details: [{
      id: 'credits',
      price: opts.amountIdr,
      quantity: 1,
      name: itemName,
    }],
    callbacks: {
      finish: `${process.env.NUXT_PUBLIC_APP_URL}/billing?status=success`,
      fail: `${process.env.NUXT_PUBLIC_APP_URL}/billing?status=failed`,
    },
  }

  const res = await fetch(`${baseUrl}/snap/v1/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(serverKey + ':').toString('base64')}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Midtrans error: ${JSON.stringify(err)}`)
  }

  const data = await res.json() as { token: string; redirect_url: string }

  try {
    const config = useRuntimeConfig()
    await sendSubscriptionInvoiceEmail(opts.user, {
      plan: opts.plan ?? 'top_up',
      invoiceNumber: opts.transactionId,
      amount: opts.creditsPurchased.toLocaleString(),
      currency: 'USD',
      billingPeriod: opts.renewedAt?.toLocaleDateString('en-US') ?? '',
      paymentMethod: 'Midtrans',
      receiptUrl: data.redirect_url
    }, config.public.PUBLIC_SITE_URL)
  } catch (error) {
    console.error(error);
  }

  return {
    paymentUrl: data.redirect_url,
    token: data.token
  }
}

export async function createXenditInvoice(opts: {
  user: User,
  transactionId: string
  amountIdr: number
  creditsPurchased: number
  plan?: string,
  renewedAt?: Date,
  description?: string,
}): Promise<{ paymentUrl: string; invoiceId: string }> {
  const secretKey = process.env.XENDIT_SECRET_KEY
  if (!secretKey) throw new Error('XENDIT_SECRET_KEY not configured')

  const desc = opts.description
    ?? `${opts.creditsPurchased.toLocaleString()} Credits — Smart Boost Labs`

  const payload = {
    external_id: opts.transactionId,
    amount: opts.amountIdr,
    description: desc,
    invoice_duration: 86400,
    customer: { email: opts.user.email },
    success_redirect_url: `${process.env.NUXT_PUBLIC_APP_URL}/billing?status=success`,
    failure_redirect_url: `${process.env.NUXT_PUBLIC_APP_URL}/billing?status=failed`,
  }

  const res = await fetch('https://api.xendit.co/v2/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Xendit error: ${JSON.stringify(err)}`)
  }

  const data = await res.json() as { id: string; invoice_url: string }

  try {
    const config = useRuntimeConfig()
    await sendSubscriptionInvoiceEmail(opts.user, {
      plan: opts.plan ?? 'top_up',
      invoiceNumber: data.id,
      amount: opts.creditsPurchased.toLocaleString(),
      currency: 'USD',
      billingPeriod: opts.renewedAt?.toLocaleDateString('en-US') ?? '',
      paymentMethod: 'Xendit',
      receiptUrl: data.invoice_url,
    }, config.public.PUBLIC_SITE_URL)
  } catch (error) {
    console.error(error);
  }

  return {
    paymentUrl: data.invoice_url,
    invoiceId: data.id
  }
}

export async function fulfillTopUp(transactionId: string): Promise<void> {
  const tx = await prisma.topUpTransaction.findUnique({
    where: { id: transactionId },
    select: { id: true, userId: true, creditsPurchased: true, status: true, amountIdr: true, gateway: true },
  })

  if (!tx) throw new Error(`Transaction ${transactionId} not found`)
  if (tx.status === 'paid') return  // idempotent

  const { subscription, transaction, creditLog } = await prisma.$transaction(async (db) => {
    const sub = await db.subscription.findUnique({
      where: { userId: tx.userId },
      select: { creditBalance: true },
    })
    if (!sub) throw new Error('Subscription not found')

    const balanceBefore = Number(sub.creditBalance)
    const amount = Number(tx.creditsPurchased)
    const balanceAfter = balanceBefore + amount

    const newSub = await db.subscription.update({
      where: { userId: tx.userId },
      data: { creditBalance: BigInt(balanceAfter) },
      include: { user: true },
    })

    const newTransaction = await db.topUpTransaction.update({
      where: { id: transactionId },
      data: { status: 'paid', paidAt: new Date() },
    })

    const newCreditLog = await db.creditLog.create({
      data: {
        userId: tx.userId,
        amount,
        type: 'credit',
        source: 'topup',
        sourceId: tx.id,
        description: `TopUp ${amount.toLocaleString()} credits — Rp ${Number(tx.amountIdr).toLocaleString('id-ID')} — Smart Boost Labs`,
        balanceBefore: BigInt(balanceBefore),
        balanceAfter: BigInt(balanceAfter),
      },
    })

    return { subscription: newSub, transaction: newTransaction, creditLog: newCreditLog }
  })

  try {
    const config = useRuntimeConfig()
    await sendTopUpInvoiceEmail(subscription.user, {
      transaction,
      invoiceNumber: transactionId,
      creditsFormatted: Number(tx.creditsPurchased).toLocaleString(),
      amountFormatted: Number(tx.amountIdr).toLocaleString('en-US'),
      currency: 'USD',
      paymentMethod: tx.gateway === 'paypal' ? 'PayPal' : tx.gateway === 'xendit' ? 'Xendit' : 'Midtrans',
      receiptUrl: transaction.paymentUrl ?? '',
    }, config.public.PUBLIC_SITE_URL)
  } catch (error) {
    console.error(error);
  }
}

export async function fulfillSubscription(transactionId: string): Promise<void> {
  const tx = await prisma.topUpTransaction.findUnique({
    where: { id: transactionId },
    select: {
      id: true, userId: true, status: true,
      creditsPurchased: true, amountIdr: true, metadata: true, gateway: true,
    },
  })

  if (!tx) throw new Error(`Transaction ${transactionId} not found`)
  if (tx.status === 'paid') return  // idempotent

  const meta = (tx.metadata ?? {}) as Record<string, any>
  const planId = meta.planId as string
  const billingCycle = (meta.billingCycle as 'monthly' | 'yearly') ?? 'monthly'
  const planName = meta.planName as string ?? planId

  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId)
  if (!plan) throw new Error(`Plan ${planId} not found`)

  // Hitung expiry date
  const now = new Date()
  const expiredAt = billingCycle === 'yearly'
    ? new Date(new Date(now).setFullYear(now.getFullYear() + 1))
    : new Date(new Date(now).setMonth(now.getMonth() + 1))

  const { subscription, transaction } = await prisma.$transaction(async (db) => {
    // Ambil balance sebelum untuk credit log
    const sub = await db.subscription.findUnique({
      where: { userId: tx.userId },
      select: { creditBalance: true },
    })

    const balanceBefore = Number(sub?.creditBalance ?? 0)
    const creditsGranted = Number(tx.creditsPurchased)
    const balanceAfter = balanceBefore + creditsGranted

    // 1. Upsert subscription — set plan baru + tambah credits
    const newSub = await db.subscription.upsert({
      where: { userId: tx.userId },
      create: {
        userId: tx.userId,
        plan: planId as any,
        creditLimit: BigInt(creditsGranted),
        creditBalance: BigInt(creditsGranted),
        creditUsed: BigInt(0),
        isActive: true,
        startedAt: new Date(),
        expiredAt,
      },
      update: {
        plan: planId as any,
        creditLimit: BigInt(creditsGranted),
        creditBalance: BigInt(balanceAfter),
        isActive: true,
        startedAt: new Date(),
        renewedAt: new Date(),
        expiredAt,
        cancelledAt: null,
      },
      include: { user: true },
    })

    // 2. Mark transaction paid
    const transaction = await db.topUpTransaction.update({
      where: { id: transactionId },
      data: { status: 'paid', paidAt: new Date() },
    })

    // 3. Credit log — pakai 'description' bukan 'note'
    await db.creditLog.create({
      data: {
        userId: tx.userId,
        amount: creditsGranted,
        type: 'credit',
        source: `subscription:${planId}:${billingCycle}`,
        sourceId: tx.id,
        description: `${planName} plan (${billingCycle}) — Rp ${Number(tx.amountIdr).toLocaleString('id-ID')} — Smart Boost Labs`,
        balanceBefore: BigInt(balanceBefore),
        balanceAfter: BigInt(balanceAfter),
      },
    })

    return { subscription: newSub, transaction: transaction }
  })

  try {
    const config = useRuntimeConfig()
    await sendTopUpInvoiceEmail(subscription.user, {
      transaction,
      invoiceNumber: transactionId,
      creditsFormatted: Number(tx.creditsPurchased).toLocaleString(),
      amountFormatted: Number(tx.amountIdr).toLocaleString('en-US'),
      currency: 'USD',
      paymentMethod: tx.gateway === 'paypal' ? 'PayPal' : tx.gateway === 'xendit' ? 'Xendit' : 'Midtrans',
      receiptUrl: transaction.paymentUrl ?? '',
    }, config.public.PUBLIC_SITE_URL)
  } catch (error) {
    console.error(error);
  }
}

async function initPaypalCLient(): Promise<Client | null> {
  const config = useRuntimeConfig()
  const mode = config.PAYPAL_MODE === 'production'
    ? Environment.Production
    : Environment.Sandbox

  try {
    const client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: config.PAYPAL_CLIENT_ID,
        oAuthClientSecret: config.PAYPAL_CLIENT_SECRET
      },
      timeout: 0,
      environment: mode,
      logging: {
        logLevel: LogLevel.Info,
        logRequest: {
          logBody: true
        },
        logResponse: {
          logHeaders: true
        }
      },
    });
    return client
  } catch (error) {
    console.error('Error initializing PayPal client:', error)
    return null
  }
}

// ── Exchange Rate ──────────────────────────────────────────────────────────────
interface ExchangeRateCache {
  rate: number
  timestamp: number
}

let rateCache: ExchangeRateCache | null = null
const RATE_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function getExchangeRate(): Promise<number> {
  const now = Date.now()
  if (rateCache && (now - rateCache.timestamp) < RATE_CACHE_TTL_MS) {
    return rateCache.rate
  }

  const apiKey = process.env.EXCHANGE_RATE_API_KEY
  if (!apiKey) {
    console.warn('[PayPal] EXCHANGE_RATE_API_KEY not set — falling back to 17500')
    const fallback = 17500
    rateCache = { rate: fallback, timestamp: now }
    return fallback
  }

  try {
    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/pair/IDR/USD/1`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) throw new Error(`Exchange rate API error: ${res.status}`)

    const data = await res.json() as {
      conversion_rate: number
    }
    const rate = data.conversion_rate
    rateCache = { rate, timestamp: now }
    return rate
  } catch (err) {
    console.error('[PayPal] Failed to fetch exchange rate:', err)
    // Fallback to cached or 16500
    if (rateCache) return rateCache.rate
    const fallback = 17500
    rateCache = { rate: fallback, timestamp: now }
    return fallback
  }
}

export async function createPaypalOrder(opts: {
  user: User
  transactionId: string
  amountIdr: number
  creditsPurchased: number
  plan?: string
  renewedAt?: Date
  description?: string
}): Promise<{ paymentUrl: string; orderId: string }> {
  const client = await initPaypalCLient()
  if (!client) throw new Error('PayPal client not initialized')

  // Convert IDR → USD
  const rate = await getExchangeRate()
  const amountUsd = Math.round((opts.amountIdr / rate) * 100) / 100

  const description = opts.description
    ?? `${opts.creditsPurchased.toLocaleString()} Credits — Smart Boost Labs`

  const bodyRequest: OrderRequest = {
    intent: CheckoutPaymentIntent.Capture,
    purchaseUnits: [
      {
        referenceId: opts.transactionId,
        amount: {
          currencyCode: 'USD',
          value: amountUsd.toFixed(2),
          breakdown: {
            itemTotal: {
              currencyCode: 'USD',
              value: amountUsd.toFixed(2),
            },
          },
        },
        description: description,
        customId: opts.transactionId,
        invoiceId: opts.transactionId,
      }
    ],
  }

  const appContext = {
    brand_name: 'Smart Boost Labs',
    landing_page: 'BILLING' as const,
    user_action: 'PAY_NOW' as const,
    return_url: `${process.env.NUXT_PUBLIC_APP_URL}/billing?status=success`,
    cancel_url: `${process.env.NUXT_PUBLIC_APP_URL}/billing?status=failed`,
  }

  const ordersController = new OrdersController(client);
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await ordersController.createOrder({
      body: bodyRequest,
      prefer: 'return=minimal',
    })
    clearTimeout(timeout)

    const body = res.result
    const approveLink = body.links?.find(l => l.rel === 'approve')
    if (!approveLink) throw new Error('No approve link in PayPal response')

    try {
      const config = useRuntimeConfig()
      await sendSubscriptionInvoiceEmail(opts.user, {
        plan: opts.plan ?? 'top_up',
        invoiceNumber: opts.transactionId,
        amount: opts.creditsPurchased.toLocaleString(),
        currency: 'USD',
        billingPeriod: opts.renewedAt?.toLocaleDateString('en-US') ?? '',
        paymentMethod: 'PayPal',
        receiptUrl: approveLink.href,
      }, config.public.PUBLIC_SITE_URL)
    } catch (error) {
      console.error(error);
    }

    return {
      paymentUrl: approveLink.href,
      orderId: body.id ?? '',
    }
  } catch (err) {
    clearTimeout(timeout)
    console.error('PayPal order creation error:', err)
    throw err
  }
}

export async function capturePaypalOrder(orderId: string): Promise<{ status: string; payerEmail?: string }> {
  const client = await initPaypalCLient()
  if (!client) throw new Error('PayPal client not initialized')

  const ordersController = new OrdersController(client);
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await ordersController.captureOrder({
      id: orderId,
      prefer: 'return=minimal',
    })
    clearTimeout(timeout)

    const body = res.result as {
      id: string
      status: string
      purchase_units: Array<{
        payments: {
          captures: Array<{ amount: { value: string; currency_code: string }; payer?: { email_address?: string } }>
        }
      }>
    }

    const capture = body.purchase_units?.[0]?.payments?.captures?.[0]
    return {
      status: body.status,
      payerEmail: capture?.payer?.email_address,
    }
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }
}

async function getPayPalAccessToken(client: Client): Promise<string> {
  const config = useRuntimeConfig();
  const auth = Buffer.from(
    `${config.PAYPAL_CLIENT_ID}:${config.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const mode = config.PAYPAL_MODE === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const response = await fetch(`${mode}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  return data.access_token;
}
export async function verifyPaypalWebhook(
  body: Record<string, unknown>,
  headers: Record<string, string | undefined>
): Promise<{ eventType: string; resource: Record<string, unknown> }> {
  const client = await initPaypalCLient()
  if (!client) throw new Error('PayPal client not initialized')

  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  if (!webhookId) throw new Error('PAYPAL_WEBHOOK_ID not configured')

  const transmissionId = headers['paypal-transmission-id'];
  const timestamp = headers['paypal-transmission-time'];
  const certUrl = headers['paypal-cert-url'];
  const authAlgo = headers['paypal-auth-algo'];
  const transmissionSig = headers['paypal-transmission-sig'];

  if (!transmissionId || !timestamp || !transmissionSig) {
    throw createError({
      statusCode: 400,
      message: 'Missing PayPal webhook headers'
    });
  }

  try {
    const accessToken = await getPayPalAccessToken(client);

    const config = useRuntimeConfig();
    const baseUrl = config.PAYPAL_MODE === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const verificationResponse = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        auth_algo: authAlgo ?? 'SHA256withRSA',
        cert_url: certUrl ?? '',
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: timestamp,
        webhook_id: webhookId,
        webhook_event: body
      })
    });

    const verificationResult = await verificationResponse.json();
    if (verificationResult.verification_status !== 'SUCCESS') {
      console.error('Webhook verification failed:', verificationResult);
      throw createError({
        statusCode: 401,
        message: 'PayPal webhook verification failed'
      });
    }

    return {
      eventType: body.event_type as string,
      resource: body.resource as PayPalWebhookResource,
    };
  } catch (err: any) {
    console.error('Webhook verification error:', err);
    if (err.statusCode) throw err;
    throw createError({
      statusCode: 400,
      message: `PayPal webhook verify error: ${err.message}`
    });
  }
}

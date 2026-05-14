import type { SubscriptionPlan } from "@forge-exchange/db"

export function calculateCredits(amountIdr: number): number {
  const BASE_RATE = 5
  const pkg = [...CREDIT_PACKAGES].reverse().find(p => amountIdr >= p.priceIdr)
  return pkg ? pkg.credits + pkg.bonus : Math.floor(amountIdr / BASE_RATE)
}


export async function createMidtransTransaction(opts: {
  userId: string
  transactionId: string
  amountIdr: number
  creditsPurchased: number
  userEmail: string
  userName: string
  description?: string
}): Promise<{ paymentUrl: string; token: string }> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY
  if (!serverKey) throw new Error('MIDTRANS_SERVER_KEY tidak dikonfigurasi')

  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  const baseUrl = isProduction
    ? 'https://app.midtrans.com'
    : 'https://app.sandbox.midtrans.com'

  const itemName = opts.description
    ?? `${opts.creditsPurchased.toLocaleString()} Credits — TrafficX`

  const payload = {
    transaction_details: {
      order_id: opts.transactionId,
      gross_amount: opts.amountIdr,
    },
    customer_details: {
      email: opts.userEmail,
      first_name: opts.userName || 'User',
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
  return { paymentUrl: data.redirect_url, token: data.token }
}

export async function createXenditInvoice(opts: {
  userId: string
  transactionId: string
  amountIdr: number
  creditsPurchased: number
  userEmail: string
  userName: string
  description?: string
}): Promise<{ paymentUrl: string; invoiceId: string }> {
  const secretKey = process.env.XENDIT_SECRET_KEY
  if (!secretKey) throw new Error('XENDIT_SECRET_KEY tidak dikonfigurasi')

  const desc = opts.description
    ?? `${opts.creditsPurchased.toLocaleString()} Credits — TrafficX`

  const payload = {
    external_id: opts.transactionId,
    amount: opts.amountIdr,
    description: desc,
    invoice_duration: 86400,
    customer: { email: opts.userEmail },
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
  return { paymentUrl: data.invoice_url, invoiceId: data.id }
}

export async function fulfillTopUp(transactionId: string): Promise<void> {
  const tx = await prisma.topUpTransaction.findUnique({
    where: { id: transactionId },
    select: { id: true, userId: true, creditsPurchased: true, status: true, amountIdr: true },
  })

  if (!tx) throw new Error('Transaksi tidak ditemukan')
  if (tx.status === 'paid') return  // idempotent

  await prisma.$transaction(async (db) => {
    const sub = await db.subscription.findUnique({
      where: { userId: tx.userId },
      select: { creditBalance: true },
    })
    if (!sub) throw new Error('Subscription tidak ditemukan')

    const balanceBefore = Number(sub.creditBalance)
    const amount = Number(tx.creditsPurchased)
    const balanceAfter = balanceBefore + amount

    await db.subscription.update({
      where: { userId: tx.userId },
      data: { creditBalance: BigInt(balanceAfter) },
    })

    await db.topUpTransaction.update({
      where: { id: transactionId },
      data: { status: 'paid', paidAt: new Date() },
    })

    await db.creditLog.create({
      data: {
        userId: tx.userId,
        amount,
        type: 'credit',
        source: 'topup',
        sourceId: tx.id,
        description: `TopUp ${amount.toLocaleString()} credits — Rp ${Number(tx.amountIdr).toLocaleString('id-ID')}`,
        balanceBefore: BigInt(balanceBefore),
        balanceAfter: BigInt(balanceAfter),
      },
    })
  })
}

export async function fulfillSubscription(transactionId: string): Promise<void> {
  const tx = await prisma.topUpTransaction.findUnique({
    where: { id: transactionId },
    select: {
      id: true, userId: true, status: true,
      creditsPurchased: true, amountIdr: true, metadata: true,
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

  await prisma.$transaction(async (db) => {
    // Ambil balance sebelum untuk credit log
    const sub = await db.subscription.findUnique({
      where: { userId: tx.userId },
      select: { creditBalance: true },
    })

    const balanceBefore = Number(sub?.creditBalance ?? 0)
    const creditsGranted = Number(tx.creditsPurchased)
    const balanceAfter = balanceBefore + creditsGranted

    // 1. Upsert subscription — set plan baru + tambah credits
    await db.subscription.upsert({
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
    })

    // 2. Mark transaction paid
    await db.topUpTransaction.update({
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
        description: `${planName} plan (${billingCycle}) — Rp ${Number(tx.amountIdr).toLocaleString('id-ID')}`,
        balanceBefore: BigInt(balanceBefore),
        balanceAfter: BigInt(balanceAfter),
      },
    })
  })
}

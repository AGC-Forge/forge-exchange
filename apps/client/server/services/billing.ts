
/// ── Credit per IDR calculation ────────────────────────────────
// 1 credit = Rp 5 (base rate)
export function calculateCredits(amountIdr: number): number {
  const BASE_RATE = 5 // IDR per credit

  // Find matching package for bonus
  const pkg = [...CREDIT_PACKAGES]
    .reverse()
    .find(p => amountIdr >= p.priceIdr)

  if (pkg) {
    return pkg.credits + pkg.bonus
  }

  // Free-form amount — base rate saja
  return Math.floor(amountIdr / BASE_RATE)
}

// ── Midtrans integration ──────────────────────────────────────
export async function createMidtransTransaction(opts: {
  userId: string
  transactionId: string
  amountIdr: number
  creditsPurchased: number
  userEmail: string
  userName: string
}): Promise<{ paymentUrl: string; token: string }> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY
  if (!serverKey) throw new Error('MIDTRANS_SERVER_KEY tidak dikonfigurasi')

  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  const baseUrl = isProduction
    ? 'https://app.midtrans.com'
    : 'https://app.sandbox.midtrans.com'

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
      name: `${opts.creditsPurchased.toLocaleString()} Credits — TrafficX`,
    }],
    callbacks: {
      finish: `${process.env.NUXT_PUBLIC_APP_URL}/billing?status=success`,
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

// ── Xendit integration ────────────────────────────────────────
export async function createXenditInvoice(opts: {
  userId: string
  transactionId: string
  amountIdr: number
  creditsPurchased: number
  userEmail: string
}): Promise<{ paymentUrl: string; invoiceId: string }> {
  const secretKey = process.env.XENDIT_SECRET_KEY
  if (!secretKey) throw new Error('XENDIT_SECRET_KEY tidak dikonfigurasi')

  const payload = {
    external_id: opts.transactionId,
    amount: opts.amountIdr,
    description: `${opts.creditsPurchased.toLocaleString()} Credits — TrafficX`,
    invoice_duration: 86400, // 24 jam
    customer: {
      email: opts.userEmail,
    },
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

// ── Fulfill transaction (add credits) ────────────────────────
export async function fulfillTopUp(transactionId: string): Promise<void> {
  const tx = await prisma.topUpTransaction.findUnique({
    where: { id: transactionId },
    select: {
      id: true, userId: true, creditsPurchased: true,
      status: true,
    },
  })

  if (!tx) throw new Error('Transaksi tidak ditemukan')
  if (tx.status === 'paid') return // idempotent — skip jika sudah diproses

  await prisma.$transaction(async (db) => {
    // Get current balance
    const sub = await db.subscription.findUnique({
      where: { userId: tx.userId },
      select: { creditBalance: true, creditUsed: true },
    })

    if (!sub) throw new Error('Subscription tidak ditemukan')

    const balanceBefore = Number(sub.creditBalance)
    const amount = Number(tx.creditsPurchased)
    const balanceAfter = balanceBefore + amount

    // Update subscription balance
    await db.subscription.update({
      where: { userId: tx.userId },
      data: { creditBalance: BigInt(balanceAfter) },
    })

    // Update transaction status
    await db.topUpTransaction.update({
      where: { id: transactionId },
      data: { status: 'paid', paidAt: new Date() },
    })

    // Credit log
    await db.creditLog.create({
      data: {
        userId: tx.userId,
        amount,
        type: 'credit',
        source: 'topup',
        sourceId: tx.id,
        description: `TopUp ${amount.toLocaleString()} credits`,
        balanceBefore: BigInt(balanceBefore),
        balanceAfter: BigInt(balanceAfter),
      },
    })
  })
}

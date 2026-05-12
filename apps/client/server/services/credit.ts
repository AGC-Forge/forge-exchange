export const CREDIT_COST = {
  standard: {
    base: 1,
    geo: 1,
    stealth: 1,
  },
  premium: {
    gologin: 4,
    adspower: 3,
    multilogin: 5,
    dolphin: 3,
    nstbrowser: 4,
    geo: 1,   // tetap ditambah untuk premium
  },
} as const

export interface CreditEstimate {
  base: number
  geoBonus: number
  stealthBonus: number
  total: number
  premiumBonus: number;
  perDay: number;
  breakdown: string
}

export function estimateCredits(opts: {
  geoEnabled?: boolean
  stealthEnabled?: boolean
  sessionMode?: 'standard' | 'premium'
  provider?: string
}): CreditEstimate {
  const mode = opts.sessionMode ?? 'standard'

  if (mode === 'premium' && opts.provider) {
    // Premium: cost dari provider + GEO bonus
    const providerCost = CREDIT_COST.premium[
      opts.provider as keyof typeof CREDIT_COST.premium
    ] ?? 4

    const geoBonus = opts.geoEnabled ? CREDIT_COST.premium.geo : 0
    const total = providerCost + geoBonus

    return {
      base: providerCost,
      geoBonus,
      premiumBonus: geoBonus,
      perDay: total,
      stealthBonus: 0,   // included di provider
      total,
      breakdown: `${opts.provider}(${providerCost})` +
        (geoBonus ? ` + geo(${geoBonus})` : ''),
    }
  }

  // Standard mode
  const base = CREDIT_COST.standard.base
  const geoBonus = opts.geoEnabled ? CREDIT_COST.standard.geo : 0
  const stealthBonus = opts.stealthEnabled ? CREDIT_COST.standard.stealth : 0
  const total = base + geoBonus + stealthBonus

  return {
    base,
    geoBonus,
    premiumBonus: 0,
    perDay: total,
    stealthBonus,
    total,
    breakdown: `base(${base})` +
      (geoBonus ? ` + geo(${geoBonus})` : '') +
      (stealthBonus ? ` + stealth(${stealthBonus})` : ''),
  }
}

export async function checkCreditBalance(
  userId: string,
  required: number,
): Promise<{ sufficient: boolean; balance: number; required: number }> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { creditBalance: true, isActive: true },
  })

  if (!sub?.isActive) {
    return { sufficient: false, balance: 0, required }
  }

  const balance = Number(sub.creditBalance)
  return { sufficient: balance >= required, balance, required }
}

export async function deductCredits(
  userId: string,
  amount: number,
  source: string,
  sourceId: string,
  description?: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.findUnique({
      where: { userId },
      select: { creditBalance: true, creditUsed: true },
    })

    if (!sub) throw new Error('Subscription tidak ditemukan')

    const balanceBefore = Number(sub.creditBalance)
    const balanceAfter = balanceBefore - amount

    if (balanceAfter < 0) throw new Error('Credit tidak mencukupi')

    await tx.subscription.update({
      where: { userId },
      data: {
        creditBalance: BigInt(balanceAfter),
        creditUsed: BigInt(Number(sub.creditUsed) + amount),
      },
    })

    await tx.creditLog.create({
      data: {
        userId,
        amount,
        type: 'debit',
        source,
        sourceId,
        description,
        balanceBefore: BigInt(balanceBefore),
        balanceAfter: BigInt(balanceAfter),
      },
    })
  })
}

export async function refundCredits(
  userId: string,
  amount: number,
  sourceId: string,
  description?: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.findUnique({
      where: { userId },
      select: { creditBalance: true, creditUsed: true },
    })

    if (!sub) throw new Error('Subscription tidak ditemukan')

    const balanceBefore = Number(sub.creditBalance)
    const balanceAfter = balanceBefore + amount

    await tx.subscription.update({
      where: { userId },
      data: {
        creditBalance: BigInt(balanceAfter),
        creditUsed: BigInt(Math.max(0, Number(sub.creditUsed) - amount)),
      },
    })

    await tx.creditLog.create({
      data: {
        userId,
        amount,
        type: 'refund',
        source: 'session',
        sourceId,
        description: description ?? 'Session refund',
        balanceBefore: BigInt(balanceBefore),
        balanceAfter: BigInt(balanceAfter),
      },
    })
  })
}

export function estimateCredits(opts: {
  proxyType?: string;
  geoEnabled?: boolean;
  stealthEnabled?: boolean;
  sessionMode?: string;
}): CreditEstimate {
  const base = 1;
  const proxy =
    opts.proxyType === "mobile" ? 5 : opts.proxyType === "residential" ? 2 : 0;
  const geo = opts.geoEnabled ? 1 : 0;
  const stealth = opts.stealthEnabled ? 1 : 0;
  const persistence =
    opts.sessionMode && opts.sessionMode !== "ephemeral" ? 1 : 0;
  const total = base + proxy + geo + stealth + persistence;

  return { base, proxy, geo, stealth, persistence, total };
}

// Check apakah user punya cukup credit
export async function checkCreditBalance(
  userId: string,
  required: number,
): Promise<{
  sufficient: boolean;
  balance: number;
  required: number;
}> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { creditBalance: true, isActive: true },
  });

  if (!sub || !sub.isActive) {
    return { sufficient: false, balance: 0, required };
  }

  const balance = Number(sub.creditBalance);
  return { sufficient: balance >= required, balance, required };
}

// Lock (deduct) credit saat session mulai
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
    });

    if (!sub) throw new Error("Subscription tidak ditemukan");

    const balanceBefore = Number(sub.creditBalance);
    const balanceAfter = balanceBefore - amount;

    if (balanceAfter < 0) throw new Error("Credit tidak mencukupi");

    await tx.subscription.update({
      where: { userId },
      data: {
        creditBalance: BigInt(balanceAfter),
        creditUsed: BigInt(Number(sub.creditUsed) + amount),
      },
    });

    await tx.creditLog.create({
      data: {
        userId,
        amount,
        type: "debit",
        source,
        sourceId,
        description,
        balanceBefore: BigInt(balanceBefore),
        balanceAfter: BigInt(balanceAfter),
      },
    });
  });
}

// Refund credit saat session gagal / dibatalkan
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
    });

    if (!sub) throw new Error("Subscription tidak ditemukan");

    const balanceBefore = Number(sub.creditBalance);
    const balanceAfter = balanceBefore + amount;

    await tx.subscription.update({
      where: { userId },
      data: {
        creditBalance: BigInt(balanceAfter),
        creditUsed: BigInt(Math.max(0, Number(sub.creditUsed) - amount)),
      },
    });

    await tx.creditLog.create({
      data: {
        userId,
        amount,
        type: "refund",
        source: "session",
        sourceId,
        description: description ?? "Session refund",
        balanceBefore: BigInt(balanceBefore),
        balanceAfter: BigInt(balanceAfter),
      },
    });
  });
}

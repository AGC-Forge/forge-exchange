type OAuthProvider = "github" | "google";

type OAuthTokenInput = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  idToken?: string;
};

export async function ensureDefaultRoleId() {
  const existing = await prisma.role.findFirst({
    where: {
      name: "user",
      level: 3,
    },
    select: {
      id: true,
    },
  });

  if (existing) return existing.id;

  try {
    const created = await prisma.role.create({
      data: {
        name: "user",
        level: 3,
      },
      select: {
        id: true,
      },
    });

    return created.id;
  } catch {
    const fallback = await prisma.role.findFirst({
      where: {
        name: "user",
        level: 3,
      },
      select: {
        id: true,
      },
    });

    if (!fallback) throw new Error("Default role tidak bisa dibuat");
    return fallback.id;
  }
}

export async function ensureDefaultRole() {
  const existing = await prisma.role.findFirst({
    where: {
      name: "user",
      level: 3,
    },
  });

  if (existing) return existing;

  try {
    const created = await prisma.role.create({
      data: {
        name: "user",
        level: 3,
      },
    });

    return created;
  } catch {
    const fallback = await prisma.role.findFirst({
      where: {
        name: "user",
        level: 3,
      },
    });

    if (!fallback) throw new Error("Default role tidak bisa dibuat");
    return fallback;
  }
}

export async function upsertOAuthUser(params: {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  name: string;
  avatar?: string | null;
  tokens?: OAuthTokenInput;
}) {
  const role = await ensureDefaultRole();

  const now = new Date();
  const expiresAt =
    params.tokens?.expiresAt != null
      ? Math.floor(params.tokens.expiresAt)
      : undefined;

  const accountExisting = await prisma.account.findFirst({
    where: {
      provider: params.provider,
      provider_account_id: params.providerAccountId,
    },
    include: {
      user: {
        include: {
          subscription: true,
          role: true,
        },
      },
    },
  });

  if (accountExisting) {
    const [account, user] = await prisma.$transaction([
      prisma.account.update({
        where: { id: accountExisting.id },
        data: {
          access_token: params.tokens?.accessToken,
          refresh_token: params.tokens?.refreshToken,
          expires_at: expiresAt,
          token_type: params.tokens?.tokenType,
          scope: params.tokens?.scope,
          id_token: params.tokens?.idToken,
        },
      }),
      prisma.user.update({
        where: { id: accountExisting.user_id },
        data: {
          lastLoginAt: now,
          name: params.name,
          avatarUrl: params.avatar ?? accountExisting.user.avatarUrl,
          emailVerifiedAt: accountExisting.user.emailVerifiedAt ?? now,
        },
        include: {
          subscription: true,
          role: true,
        },
      }),
    ]);

    return { account, user, role };
  }

  const userByEmail = await prisma.user.findUnique({
    where: { email: params.email },
    include: {
      subscription: true,
      role: true,
    },
  });

  if (userByEmail) {
    const [account, user] = await prisma.$transaction([
      prisma.account.create({
        data: {
          user_id: userByEmail.id,
          type: "oauth",
          provider: params.provider,
          provider_account_id: params.providerAccountId,
          access_token: params.tokens?.accessToken,
          refresh_token: params.tokens?.refreshToken,
          expires_at: expiresAt,
          token_type: params.tokens?.tokenType,
          scope: params.tokens?.scope,
          id_token: params.tokens?.idToken,
        },
      }),
      prisma.user.update({
        where: { id: userByEmail.id },
        data: {
          lastLoginAt: now,
          name: params.name,
          avatarUrl: params.avatar ?? userByEmail.avatarUrl,
          emailVerifiedAt: userByEmail.emailVerifiedAt ?? now,
        },
        include: {
          subscription: true,
          role: true,
        },
      }),
    ]);

    return { account, user, role };
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: params.name,
        email: params.email,
        avatarUrl: params.avatar ?? null,
        role_id: role.id,
        emailVerifiedAt: now,
        lastLoginAt: now,
        isActive: true,
      },
      include: {
        role: true,
        subscription: true,
      },
    });

    await tx.subscription.create({
      data: {
        userId: user.id,
        plan: "free",
        creditLimit: BigInt(100),
        creditBalance: BigInt(100),
        creditUsed: BigInt(0),
        isActive: true,
      },
    });

    const account = await tx.account.create({
      data: {
        user_id: user.id,
        type: "oauth",
        provider: params.provider,
        provider_account_id: params.providerAccountId,
        access_token: params.tokens?.accessToken,
        refresh_token: params.tokens?.refreshToken,
        expires_at: expiresAt,
        token_type: params.tokens?.tokenType,
        scope: params.tokens?.scope,
        id_token: params.tokens?.idToken,
      },
    });

    return { user, account };
  });

  const userWithSubscription = await prisma.user.findUnique({
    where: { id: result.user.id },
    include: {
      role: true,
      subscription: true,
    },
  });

  return { account: result.account, user: userWithSubscription, role };
}

import { prisma } from "./db";

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
      level: 0,
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
        level: 0,
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
        level: 0,
      },
      select: {
        id: true,
      },
    });

    if (!fallback) throw new Error("Default role tidak bisa dibuat");
    return fallback.id;
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
  const roleId = await ensureDefaultRoleId();

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
      user: true,
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
          last_login_at: now,
          name: params.name,
          avatar: params.avatar ?? accountExisting.user.avatar,
          email_verified_at: accountExisting.user.email_verified_at ?? now,
        },
      }),
    ]);

    return { account, user };
  }

  const userByEmail = await prisma.user.findUnique({
    where: { email: params.email },
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
          last_login_at: now,
          name: params.name,
          avatar: params.avatar ?? userByEmail.avatar,
          email_verified_at: userByEmail.email_verified_at ?? now,
        },
      }),
    ]);

    return { account, user };
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: params.name,
        email: params.email,
        avatar: params.avatar ?? null,
        role_id: roleId,
        email_verified_at: now,
        last_login_at: now,
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

  return result;
}


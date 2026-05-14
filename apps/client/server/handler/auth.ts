import { type H3Event, H3Error } from "h3";
import { z } from "zod";
import type { Subscription, SubscriptionPlan } from "@forge-exchange/db";

// ── Helpers ────────────────────────────────────────────────
export function serializeSubscription(
  sub: Subscription | null,
): Record<string, any> | null {
  if (!sub) return null;
  return {
    id: sub.id,
    plan: sub.plan,
    isActive: sub.isActive,
    creditLimit: Number(sub.creditLimit),
    creditBalance: Number(sub.creditBalance),
    creditUsed: Number(sub.creditUsed),
    startedAt: sub.startedAt,
    expiredAt: sub.expiredAt,
  };
}

const registerSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters long" })
      .max(32, { message: "Password must be at most 32 characters long" })
      .regex(/[a-z]/, {
        message: "Password must contain at least one lowercase letter",
      })
      .regex(/[A-Z]/, {
        message: "Password must contain at least one uppercase letter",
      })
      .regex(/[0-9]/, { message: "Password must contain at least one number" })
      .regex(/[^a-zA-Z0-9]/, {
        message: "Password must contain at least one special character",
      })
      .trim(),
    confirmPassword: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password do not match.",
        path: ["confirmPassword"],
      });
    }
  });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const resendEmailSchema = z.object({
  email: z.string().email(),
});
const forgotSchema = z.object({
  email: z.string().email(),
});
const verifyEmailSchema = z.object({
  token: z.string().min(1),
});
export const registerHandler = async (event: H3Event) => {
  try {
    const baseConfig = await getSetupConfig();
    if (!baseConfig.enable_register) {
      throw createError({
        statusCode: 403,
        statusMessage: "Registration is disabled",
        data: {
          code: "REGISTRATION_DISABLED",
          message: "Registration is disabled",
        },
      });
    }

    const ip = getClientIp(event);
    if (!checkRateLimit(`register:${ip}`, 5, 15 * 60 * 1000))
      throw createError({
        statusCode: 429,
        statusMessage: "Too many attempts. Try again in 15 minutes.",
        data: {
          code: "RATE_LIMIT",
        },
      });

    const query = getQuery(event);
    const plan = query.plan as SubscriptionPlan || "free";

    const body = registerSchema.safeParse(await readBody(event));
    if (!body.success) {
      throw createError({
        statusCode: 400,
        statusMessage: body.error.issues.map((e) => e.message).join(", "),
        data: {
          code: "VALIDATION_ERROR",
          message: body.error.issues.map((e) => e.message).join(", "),
        },
      });
    }
    const role = await ensureDefaultRole();
    const roleId = role.id;

    const email = body.data.email.toLowerCase().trim();
    const name = body.data.name.trim();

    const passwordHash = await generateHashPassword(body.data.password);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw createError({
        statusCode: 409,
        statusMessage: "Email already registered",
        data: {
          code: "EMAIL_ALREADY_REGISTERED",
          message: "Email already registered",
        },
      });
    }

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash: passwordHash,
          name,
          timezone: getTimezone(event).timezone,
          role_id: roleId,
          isActive: true,
          emailVerified: false,
        },
      });

      await tx.account.create({
        data: {
          user_id: newUser.id,
          type: "email",
          provider: "email",
          provider_account_id: newUser.id,
        },
      });

      await tx.subscription.create({
        data: {
          userId: newUser.id,
          plan,
          creditLimit: BigInt(100),
          creditBalance: BigInt(100),
          creditUsed: BigInt(0),
          isActive: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          action: "register",
          resource: "user",
          resourceId: newUser.id,
          ipAddress: ip,
          userAgent: getHeader(event, "user-agent") || null,
        },
      });

      return newUser;
    });

    if (user.emailVerifiedAt) {
      await setUserSession(event, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role_id: user.role_id,
          timezone: getTimezone(event).timezone,
          emailVerified: user.emailVerified,
          emailVerifiedAt: user.emailVerifiedAt,
          role: role,
          subscription: null,
        },
        provider: "email",
        loggedInAt: new Date().toISOString(),
      });

      return {
        success: true,
        message: "User registered successfully",
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role_id: user.role_id,
        },
      };
    }

    const token = generateToken(32);
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await prisma.verificationToken.deleteMany({
      where: { identifier: user.email },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        expires,
      },
    });

    const config = useRuntimeConfig();
    const baseUrl =
      config.public.PUBLIC_SITE_URL ||
      config.PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const url = `${baseUrl.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}&plan=${plan}`;

    const { sendMail } = useNodeMailer();
    await sendMail({
      to: user.email,
      subject: "Verify your email",
      text: `Open this link to verify your email: ${url}`,
      html: `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
        <h2 style="margin: 0 0 12px;">Verify your email</h2>
        <p style="margin: 0 0 12px;">Click the button below to verify your email address.</p>
        <p style="margin: 0 0 18px;">
          <a href="${url}" style="display:inline-block;background:#111827;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;">
            Verify email
          </a>
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 12px;">
          This link expires in 24 hours.
        </p>
      </div>
    `,
    });

    return {
      success: true,
      message:
        "User registered successfully. please verify your email address.",
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role_id: user.role_id,
      },
    };
  } catch (err) {
    throw handleRequestError(err);
  }
};
export const loginHandler = async (event: H3Event) => {
  try {
    const ip = getClientIp(event);
    if (!checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
      throw createError({
        statusCode: 429,
        statusMessage: "Too many requests, please try again later",
        data: {
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests, please try again later",
        },
      });
    }

    const body = loginSchema.safeParse(await readBody(event));
    console.log("loginHandler", body);
    if (!body.success) {
      throw createError({
        statusCode: 400,
        statusMessage: body.error.issues
          .map((issue) => issue.message)
          .join(", "),
        data: {
          code: "INVALID_REQUEST",
          message: body.error.issues.map((issue) => issue.message).join(", "),
        },
      });
    }

    const password = body.data.password;

    const user = await prisma.user.findUnique({
      where: { email: body.data.email },
      include: { subscription: true, role: true },
    });

    if (!user || !user.passwordHash) {
      throw createError({
        statusCode: 401,
        statusMessage: "Email or password incorrect",
        data: {
          code: "INVALID_CREDENTIALS",
          message: "Email or password incorrect",
        },
      });
    }

    if (!user?.isActive) {
      throw createError({
        statusCode: 403,
        statusMessage: "Account is disabled",
        data: {
          code: "ACCOUNT_DISABLED",
          message: "Account is disabled",
        },
      });
    }

    if (!user.emailVerifiedAt) {
      throw createError({
        statusCode: 403,
        statusMessage: "Email not confirmed",
        data: {
          code: "EMAIL_NOT_VERIFIED",
          message: "Email not confirmed",
        },
      });
    }

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid login credentials",
        data: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid login credentials",
        },
      });
    }

    const now = new Date();

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "login",
        resource: "user",
        resourceId: user.id,
        ipAddress: ip,
        userAgent: getHeader(event, "user-agent") || null,
      },
    });

    const sub = serializeSubscription(user.subscription);

    await setUserSession(event, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role_id: user.role_id,
        timezone: getTimezone(event).timezone,
        role: user.role,
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerifiedAt || null,
        subscription: sub,
      },
      provider: "email",
      loggedInAt: now.toISOString(),
    });

    // Return redirect URL instead of sendRedirect to avoid race conditions with session sync
    const redirectTo = (getQuery(event).redirect as string) || "/app";
    return { redirectTo };
  } catch (error) {
    throw handleRequestError(error);
  }
};
export const resendEmailHandler = async (
  event: H3Event,
): Promise<H3Error | void> => {
  try {
    const ip = getClientIp(event);
    if (!checkRateLimit(`resend-email:${ip}`, 10, 15 * 60 * 1000)) {
      throw createError({
        statusCode: 429,
        statusMessage: "Too many requests, please try again later",
        data: {
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests, please try again later",
        },
      });
    }

    const body = resendEmailSchema.safeParse(await readBody(event));
    if (!body.success) {
      throw createError({
        statusCode: 400,
        statusMessage: body.error.issues
          .map((issue) => issue.message)
          .join(", "),
        data: {
          code: "INVALID_REQUEST",
          message: body.error.issues.map((issue) => issue.message).join(", "),
        },
      });
    }

    const query = getQuery(event);
    const plan = query.plan as SubscriptionPlan || "free";

    const email = body.data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email },
      include: { subscription: true, role: true },
    });
    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: "User not found",
        data: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }
    if (!user.isActive) {
      throw createError({
        statusCode: 403,
        statusMessage: "Account is disabled",
        data: {
          code: "ACCOUNT_DISABLED",
          message: "Account is disabled",
        },
      });
    }
    if (user.emailVerifiedAt) {
      throw createError({
        statusCode: 403,
        statusMessage: "Email already confirmed",
        data: {
          code: "EMAIL_ALREADY_VERIFIED",
          message: "Email already confirmed",
        },
      });
    }

    const token = generateToken(32);
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await prisma.verificationToken.deleteMany({
      where: { identifier: user.email },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        expires,
      },
    });

    const config = useRuntimeConfig();
    const baseUrl =
      config.public.PUBLIC_SITE_URL ||
      config.PUBLIC_SITE_URL ||
      "http://localhost:3000";
    const url = `${baseUrl.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}&plan=${plan}`;

    const { sendMail } = useNodeMailer();
    await sendMail({
      to: user.email,
      subject: "Verify your email",
      text: `Open this link to verify your email: ${url}`,
      html: `
          <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
            <h2 style="margin: 0 0 12px;">Verify your email</h2>
            <p style="margin: 0 0 12px;">Click the button below to verify your email address.</p>
            <p style="margin: 0 0 18px;">
              <a href="${url}" style="display:inline-block;background:#111827;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;">
                Verify email
              </a>
            </p>
            <p style="margin: 0; color: #6b7280; font-size: 12px;">
              This link expires in 24 hours.
            </p>
          </div>
        `,
    });
  } catch (error) {
    throw handleRequestError(error);
  }
};
export const forgotHandler = async (
  event: H3Event,
): Promise<H3Error | void> => {
  try {
    const ip = getClientIp(event);
    if (!checkRateLimit(`resend-email:${ip}`, 10, 15 * 60 * 1000)) {
      throw createError({
        statusCode: 429,
        statusMessage: "Too many requests, please try again later",
        data: {
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests, please try again later",
        },
      });
    }

    const body = forgotSchema.safeParse(await readBody(event));
    if (!body.success) {
      throw createError({
        statusCode: 400,
        statusMessage: body.error.issues
          .map((issue) => issue.message)
          .join(", "),
        data: {
          code: "INVALID_REQUEST",
          message: body.error.issues.map((issue) => issue.message).join(", "),
        },
      });
    }

    const email = body.data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, is_active: true, password_hash: true },
    });

    if (!user || !user.is_active || !user.password_hash) {
      throw createError({
        statusCode: 404,
        statusMessage: "User not found or account is disabled",
        data: {
          code: "USER_NOT_FOUND",
          message: "User not found or account is disabled",
        },
      });
    }

    const token = generateToken(32);
    const expires = new Date(Date.now() + 1000 * 60 * 60);

    await prisma.passwordResetToken.deleteMany({
      where: { user_id: user.id, used: false },
    });

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expires,
        used: false,
      },
    });

    const config = useRuntimeConfig();
    const baseUrl =
      config.public.PUBLIC_SITE_URL ||
      config.PUBLIC_SITE_URL ||
      "http://localhost:3000";
    const url = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

    const { sendMail } = useNodeMailer();
    await sendMail({
      to: email,
      subject: "Reset your password",
      text: `Open this link to reset your password: ${url}`,
      html: `
          <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
            <h2 style="margin: 0 0 12px;">Reset your password</h2>
            <p style="margin: 0 0 12px;">Click the button below to set a new password.</p>
            <p style="margin: 0 0 18px;">
              <a href="${url}" style="display:inline-block;background:#111827;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;">
                Reset password
              </a>
            </p>
            <p style="margin: 0; color: #6b7280; font-size: 12px;">
              If you didn’t request this, you can ignore this email.
            </p>
          </div>
        `,
    });
  } catch (error) {
    throw handleRequestError(error);
  }
};
export const verifyEmailHandler = async (event: H3Event) => {
  try {
    const body = verifyEmailSchema.safeParse(await readBody(event));
    if (!body.success) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid input",
        data: {
          code: "INVALID_REQUEST",
          message: body.error.issues.map((issue) => issue.message).join(", "),
        },
      });
    }

    const token = body.data.token.trim();
    const query = getQuery(event);
    const plan = query.plan as SubscriptionPlan || "free";

    const verification = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verification || verification.expires.getTime() < Date.now()) {
      throw createError({
        statusCode: 400,
        statusMessage: "Verification link is invalid or has expired",
        data: {
          code: "VERIFICATION_LINK_INVALID",
          message: "Verification link is invalid or has expired",
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: verification.identifier },
    });

    if (!user) {
      throw createError({
        statusCode: 400,
        statusMessage: "User not found",
        data: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          isActive: true,
        },
        include: {
          subscription: true,
          role: true,
        },
      })
      await tx.verificationToken.delete({
        where: { token },
      })

      return { user: newUser };
    });

    await setUserSession(event, {
      user: {
        id: result.user?.id,
        email: result.user?.email,
        name: result.user?.name,
        avatarUrl: result.user?.avatarUrl,
        role_id: result.user?.role_id,
        timezone: getTimezone(event).timezone,
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerifiedAt,
        role: result.user.role,
        subscription: serializeSubscription(result.user.subscription ?? null),
      },
      provider: "email",
      loggedInAt: new Date().toISOString(),
    });

    const redirectUrl = plan === "free" ? "/app/billing" : `/app/billing/checkout?plan=${plan}`;

    return {
      success: true,
      message: "Email verified successfully.",
      data: {
        redirectUrl
      }
    }

  } catch (error) {
    throw handleRequestError(error);
  }
};

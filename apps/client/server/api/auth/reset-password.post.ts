import { hash } from "bcryptjs";
import { z } from "zod";

const schema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8).max(72),
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

export default defineEventHandler(async (event) => {
  const body = schema.safeParse(await readBody(event));
  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid input",
    });
  }

  const token = body.data.token.trim();

  const reset = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!reset || reset.used || reset.expires.getTime() < Date.now()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Reset link is invalid or has expired",
    });
  }

  const passwordHash = await hash(body.data.password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash: passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { token },
      data: { used: true },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: reset.userId, used: false },
      data: { used: true },
    }),
  ]);

  const config = useRuntimeConfig()
  const { clientIp, userAgent, locationClient } = await getAllHeaderIdentifiers(event);

  try {
    sendPasswordResetSuccessEmail(reset.user, config.public.PUBLIC_SITE_URL)
    sendSuspiciousActivityEmail(reset.user, {
      type: "change_password",
      ip: clientIp,
      userAgent,
      location: locationClient,
      timestamp: new Date(),
      secureUrl: "/login",
    }, config.public.PUBLIC_SITE_URL)
  } catch (error) {
    console.error(error);
  }

  return { ok: true };
});

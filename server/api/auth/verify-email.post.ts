import { z } from "zod";
import { prisma } from "../../utils/db";

const schema = z.object({
  token: z.string().min(1),
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

  const verification = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!verification || verification.expires.getTime() < Date.now()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Verification link is invalid or has expired",
    });
  }

  const user = await prisma.user.findUnique({
    where: { email: verification.identifier },
  });

  if (!user) {
    throw createError({
      statusCode: 400,
      statusMessage: "User not found",
    });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        email_verified_at: user.email_verified_at ?? new Date(),
        is_active: true,
      },
    }),
    prisma.verificationToken.delete({
      where: { token },
    }),
  ]);

  return { ok: true };
});


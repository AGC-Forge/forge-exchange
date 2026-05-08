import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../utils/db";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const body = schema.safeParse(await readBody(event));
  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid input",
    });
  }

  const email = body.data.email.toLowerCase().trim();
  const password = body.data.password;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.password_hash) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid login credentials",
    });
  }

  if (!user.is_active) {
    throw createError({
      statusCode: 403,
      statusMessage: "Account is disabled",
    });
  }

  if (!user.email_verified_at) {
    throw createError({
      statusCode: 403,
      statusMessage: "Email not confirmed",
    });
  }

  const ok = await compare(password, user.password_hash);
  if (!ok) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid login credentials",
    });
  }

  const now = new Date();

  await prisma.user.update({
    where: { id: user.id },
    data: { last_login_at: now },
  });

  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      roleId: user.role_id,
    },
    provider: "email",
    loggedInAt: now,
  });

  return { ok: true };
});

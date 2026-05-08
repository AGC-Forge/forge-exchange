import { z } from "zod";
import { prisma } from "../../utils/db";
import { generateToken } from "../../utils/token";

const schema = z.object({
  email: z.string().email(),
});

export default defineEventHandler(async (event) => {
  const { sendMail } = useNodeMailer();

  const body = schema.safeParse(await readBody(event));
  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid input",
    });
  }

  const email = body.data.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      email_verified_at: true,
      is_active: true,
      password_hash: true,
    },
  });

  if (
    !user ||
    !user.is_active ||
    user.email_verified_at ||
    !user.password_hash
  ) {
    return { ok: true };
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
  const url = `${baseUrl.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;

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

  return { ok: true };
});

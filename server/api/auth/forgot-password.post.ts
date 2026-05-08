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
    select: { id: true, is_active: true, password_hash: true },
  });

  if (!user || !user.is_active || !user.password_hash) {
    return { ok: true };
  }

  const token = generateToken(32);
  const expires = new Date(Date.now() + 1000 * 60 * 60);

  await prisma.passwordResetToken.deleteMany({
    where: { user_id: user.id, used: false },
  });

  await prisma.passwordResetToken.create({
    data: {
      token,
      user_id: user.id,
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

  return { ok: true };
});

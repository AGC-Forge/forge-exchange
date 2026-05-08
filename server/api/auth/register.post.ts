import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../utils/db";
import { ensureDefaultRoleId } from "../../utils/auth";
import { generateToken } from "../../utils/token";

const schema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
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
  const { sendMail } = useNodeMailer();

  const body = schema.safeParse(await readBody(event));
  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid input",
    });
  }

  const roleId = await ensureDefaultRoleId();
  const now = new Date();

  const email = body.data.email.toLowerCase().trim();
  const name = body.data.name.trim();

  const passwordHash = await hash(body.data.password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });

  const user = await (async () => {
    if (!existing) {
      return prisma.user.create({
        data: {
          name,
          email,
          password_hash: passwordHash,
          role_id: roleId,
          email_verified_at: null,
          last_login_at: null,
          is_active: true,
        },
      });
    }

    if (existing.password_hash) {
      throw createError({
        statusCode: 409,
        statusMessage: "Email already registered",
      });
    }

    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        password_hash: passwordHash,
        email_verified_at: existing.email_verified_at,
        last_login_at: existing.last_login_at,
      },
    });
  })();

  if (user.email_verified_at) return { ok: true };

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

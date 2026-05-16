import nodemailer from "nodemailer";
import type { User, Subscription, TopUpTransaction } from "@forge-exchange/db"

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface MailerData<T = any> extends MailOptions {
  data: T;
  destinationUrl?: string;
  additional?: string;
}

type SuspiciousActivityType =
  | "login"
  | "change_password"
  | "change_email"
  | "api_key_reset"
  | "two_factor_disabled"
  | "unknown";


interface ClientLocation {
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: string;
  lon?: string;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  query?: string;
}

interface SuspiciousActivityPayload {
  type: SuspiciousActivityType;
  ip: string;
  userAgent?: string;
  location?: ClientLocation;
  timestamp: Date;
  secureUrl: string; // URL to lock/secure account
}

interface InvoiceSubscriptionPayload {
  plan: string;
  invoiceNumber: string;
  amount: string; // formatted, e.g. "$29.00"
  currency: string;
  billingPeriod: string; // e.g. "June 1 – June 30, 2025"
  paymentMethod: string;
  receiptUrl?: string;
}

interface InvoiceTopUpPayload {
  transaction: TopUpTransaction;
  invoiceNumber: string;
  creditsFormatted: string; // e.g. "50,000 credits"
  amountFormatted: string;  // e.g. "$25.00"
  currency: string;
  paymentMethod: string;
  receiptUrl?: string;
}

interface InsufficientBalancePayload {
  subscription?: Subscription;
  creditBalance: string;       // formatted
  creditLimit: string;         // formatted
  usagePercent: number;        // 0–100
  upgradeUrl: string;
  topUpUrl: string;
}

export async function sendMail(input: MailOptions) {
  const config = useRuntimeConfig();

  const host = config.NUXT_NODEMAILER_HOST;
  const port = Number(config.NUXT_NODEMAILER_PORT);
  const secure = config.NUXT_NODEMAILER_SECURE === "true";
  const user = config.NUXT_NODEMAILER_AUTH_USER;
  const pass = config.NUXT_NODEMAILER_AUTH_PASS ?? config.NUXT_NODEMAILER_AUTH_PASSWORD;
  const from = config.NUXT_NODEMAILER_FROM;

  if (!host || !port || !user || !pass) {
    throw createError({
      statusCode: 500,
      statusMessage: "SMTP is not configured",
    });
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,             // true = implicit SSL (port 465), false = STARTTLS (port 587)
    requireTLS: !secure, // Force TLS upgrade on port 587 (STARTTLS)
    auth: { user, pass },
    tls: {
      // Spacemail may use a self-signed or internal CA cert
      rejectUnauthorized: false,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  try {
    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  } catch (err: any) {
    console.error("[Mailer] SMTP send failed:", err?.message);
    throw createError({
      statusCode: 502,
      statusMessage: `Mailer error: ${err?.message}`,
    });
  }
}

function buildEmailShell(body: string, preview: string, siteUrl: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>Smart Boost Labs</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'DM Sans',Arial,sans-serif;background:#0f0f11;color:#e8e8ec;-webkit-font-smoothing:antialiased;}
    a{color:#7c6ef7;text-decoration:none;}
    .preheader{display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;max-height:0;max-width:0;overflow:hidden;mso-hide:all;}
    @media(max-width:600px){
      .email-wrapper{padding:16px!important;}
      .email-card{padding:28px 20px!important;}
      .btn{display:block!important;text-align:center!important;}
    }
  </style>
</head>
<body>
  <!-- Preview text -->
  <div class="preheader" aria-hidden="true">${preview}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0f0f11;">
    <tr>
      <td class="email-wrapper" style="padding:40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:0 auto;">

          <!-- Logo / Header -->
          <tr>
            <td style="padding-bottom:28px;text-align:center;">
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
                <tr>
                  <td style="background:linear-gradient(135deg,#7c6ef7,#5b4fe8);border-radius:12px;padding:10px 18px;">
                    <span style="font-family:'DM Mono',monospace;font-size:18px;font-weight:500;color:#fff;letter-spacing:-0.5px;">⬡ Smart Boost Labs</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td class="email-card" style="background:#18181d;border:1px solid #2a2a33;border-radius:16px;padding:40px 36px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:28px;text-align:center;">
              <p style="font-size:12px;color:#55555f;line-height:1.7;">
                You're receiving this email because you have an account at
                <a href="${siteUrl}" style="color:#7c6ef7;">Smart Boost Labs</a>.<br/>
                If you didn't request this, you can safely ignore it.
              </p>
              <p style="margin-top:12px;font-size:11px;color:#3d3d47;">
                © ${new Date().getFullYear()} Smart Boost Labs · All rights reserved
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function primaryButton(label: string, url: string): string {
  return /* html */ `
  <table cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0;">
    <tr>
      <td style="border-radius:10px;background:linear-gradient(135deg,#7c6ef7,#5b4fe8);box-shadow:0 4px 20px rgba(124,110,247,0.35);">
        <a href="${url}" class="btn" style="display:inline-block;padding:14px 32px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#fff;letter-spacing:0.1px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function warningButton(label: string, url: string): string {
  return /* html */ `
  <table cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0;">
    <tr>
      <td style="border-radius:10px;background:linear-gradient(135deg,#e8633a,#c9472a);box-shadow:0 4px 20px rgba(232,99,58,0.35);">
        <a href="${url}" class="btn" style="display:inline-block;padding:14px 32px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#fff;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function greeting(user: Partial<User>): string {
  const name = user?.name?.split(" ")[0] ?? "there";
  return /* html */ `<p style="font-size:15px;color:#9898a6;margin-bottom:8px;">Hello,</p>
  <h1 style="font-size:24px;font-weight:600;color:#e8e8ec;margin-bottom:20px;line-height:1.3;">${name} 👋</h1>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #2a2a33;margin:28px 0;"/>`;
}

function fallbackUrl(url: string): string {
  return /* html */ `
  <p style="font-size:13px;color:#55555f;margin-top:16px;line-height:1.6;">
    Button not working? Copy and paste this link into your browser:<br/>
    <span style="font-family:'DM Mono',monospace;font-size:12px;color:#7c6ef7;word-break:break-all;">${url}</span>
  </p>`;
}

function expiryNote(minutes: number): string {
  return /* html */ `
  <p style="font-size:13px;color:#e8633a;margin-top:16px;">
    ⏱ This link expires in <strong>${minutes} minutes</strong>.
  </p>`;
}

function infoRow(label: string, value: string): string {
  return /* html */ `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #222228;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="font-size:13px;color:#55555f;width:45%;">${label}</td>
          <td style="font-size:13px;color:#c8c8d4;font-weight:500;text-align:right;">${value}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function badge(text: string, color: string = "#7c6ef7"): string {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${color}22;color:${color};font-size:12px;font-weight:600;letter-spacing:0.3px;border:1px solid ${color}44;">${text}</span>`;
}

// ─────────────────────────────────────────────
// 1. Email Verification (Registration)
// ─────────────────────────────────────────────

export async function sendEmailVerificationEmail(user: Partial<User>, verificationUrl: string, siteUrl: string) {
  const body = /* html */ `
    ${greeting(user)}
    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:8px;">
      Thanks for signing up at <strong style="color:#e8e8ec;">Smart Boost Labs</strong>.
      Please verify your email address to activate your account and start using our platform.
    </p>
    ${primaryButton("Verify Email Address", verificationUrl)}
    ${expiryNote(60)}
    ${divider()}
    <p style="font-size:13px;color:#55555f;line-height:1.6;">
      If you didn't create an account with us, you can safely ignore this email —
      no action is required from your side.
    </p>
    ${fallbackUrl(verificationUrl)}
  `;

  await sendMail({
    to: user?.email ?? "",
    subject: "Verify your email address – Smart Boost Labs",
    text: `Verify your email: ${verificationUrl}`,
    html: buildEmailShell(body, "One click to activate your Smart Boost Labs account.", siteUrl),
  });
}

// ─────────────────────────────────────────────
// 2. Resend Email Verification
// ─────────────────────────────────────────────

export async function sendResendVerificationEmail(user: Partial<User>, verificationUrl: string, siteUrl: string) {
  const body = /* html */ `
    ${greeting(user)}
    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:8px;">
      You requested a new email verification link. Use the button below to verify your
      email address. Your previous link has been invalidated.
    </p>
    ${primaryButton("Verify Email Address", verificationUrl)}
    ${expiryNote(60)}
    ${divider()}
    <p style="font-size:13px;color:#55555f;line-height:1.6;">
      If you didn't request this, someone may have entered your email by mistake —
      you can safely ignore this email.
    </p>
    ${fallbackUrl(verificationUrl)}
  `;

  await sendMail({
    to: user?.email ?? "",
    subject: "New verification link – Smart Boost Labs",
    text: `New verification link: ${verificationUrl}`,
    html: buildEmailShell(body, "Here's your new verification link — it replaces the previous one.", siteUrl),
  });
}

// ─────────────────────────────────────────────
// 3. Forgot Password (send reset link)
// ─────────────────────────────────────────────

export async function sendForgotPasswordEmail(user: Partial<User>, resetUrl: string, siteUrl: string) {
  const body = /* html */ `
    ${greeting(user)}
    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:8px;">
      We received a request to reset the password for your Smart Boost Labs account.
      Click the button below to choose a new password.
    </p>
    ${primaryButton("Reset My Password", resetUrl)}
    ${expiryNote(30)}
    ${divider()}
    <p style="font-size:13px;color:#55555f;line-height:1.6;">
      If you didn't request a password reset, your account may be at risk.
      We recommend you <a href="${siteUrl}/contact" style="color:#7c6ef7;">contact support</a> immediately.
    </p>
    ${fallbackUrl(resetUrl)}
  `;

  await sendMail({
    to: user?.email ?? "",
    subject: "Reset your password – Smart Boost Labs",
    text: `Reset your password: ${resetUrl}`,
    html: buildEmailShell(body, "You requested a password reset. Here's your secure link.", siteUrl),
  });
}

// ─────────────────────────────────────────────
// 4. Password Reset Confirmation (after success)
// ─────────────────────────────────────────────

export async function sendPasswordResetSuccessEmail(user: Partial<User>, siteUrl: string) {
  const timestamp = new Date().toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const body = /* html */ `
    ${greeting(user)}
    <div style="background:#1e2d1e;border:1px solid #2d4a2d;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="font-size:14px;color:#6fcf6f;font-weight:500;">✓ Your password has been successfully changed.</p>
    </div>
    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:8px;">
      Your Smart Boost Labs password was updated on <strong style="color:#e8e8ec;">${timestamp}</strong>.
      If this was you, no further action is needed.
    </p>
    ${divider()}
    <p style="font-size:14px;color:#e8633a;font-weight:500;">Wasn't you?</p>
    <p style="font-size:13px;color:#9898a6;margin-top:8px;line-height:1.6;">
      If you did not make this change, your account may have been compromised.
      Please <a href="${siteUrl}/contact" style="color:#7c6ef7;">contact support</a> immediately
      or use the forgot password flow to regain access.
    </p>
  `;

  await sendMail({
    to: user?.email ?? "",
    subject: "Your password was changed – Smart Boost Labs",
    text: "Your password has been successfully changed. If this wasn't you, contact support immediately.",
    html: buildEmailShell(body, "Your Smart Boost Labs password was just updated.", siteUrl),
  });
}

// ─────────────────────────────────────────────
// 5. Invoice – Subscription
// ─────────────────────────────────────────────

export async function sendSubscriptionInvoiceEmail(
  user: Partial<User>,
  payload: InvoiceSubscriptionPayload,
  siteUrl: string
) {
  const planBadge: Record<string, string> = {
    free: "#55555f",
    starter: "#3a9e6f",
    pro: "#7c6ef7",
    enterprise: "#e8a33a",
  };
  const color = planBadge[payload.plan.toLowerCase()] ?? "#7c6ef7";

  const body = /* html */ `
    ${greeting(user)}
    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:20px;">
      Your payment for the <strong style="color:#e8e8ec;">${payload.plan}</strong> plan was successful.
      Here's your invoice summary.
    </p>

    <!-- Invoice card -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
      style="background:#0f0f11;border:1px solid #2a2a33;border-radius:12px;overflow:hidden;margin-bottom:8px;">
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid #1e1e24;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td>
                <p style="font-size:11px;color:#55555f;text-transform:uppercase;letter-spacing:1px;">Invoice</p>
                <p style="font-size:15px;font-weight:600;color:#e8e8ec;font-family:'DM Mono',monospace;">${payload.invoiceNumber}</p>
              </td>
              <td style="text-align:right;">
                ${badge(payload.plan.toUpperCase(), color)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tbody>
        ${infoRow("Billing Period", payload.billingPeriod)}
        ${infoRow("Payment Method", payload.paymentMethod)}
        ${infoRow("Currency", payload.currency)}
        ${infoRow("Status", "✓ Paid")}
      </tbody>
      <tr>
        <td style="padding:14px 20px;background:#1a1a22;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="font-size:14px;color:#9898a6;font-weight:500;">Total Charged</td>
              <td style="text-align:right;font-size:22px;font-weight:600;color:#e8e8ec;font-family:'DM Mono',monospace;">${payload.amount}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${payload.receiptUrl ? primaryButton("View Full Receipt", payload.receiptUrl) : ""}

    ${divider()}
    <p style="font-size:13px;color:#55555f;line-height:1.6;">
      Questions about your invoice? <a href="${siteUrl}/contact" style="color:#7c6ef7;">Contact our billing team</a>.
    </p>
  `;

  await sendMail({
    to: user?.email ?? "",
    subject: `Invoice ${payload.invoiceNumber} – Smart Boost Labs`,
    text: `Your ${payload.plan} plan invoice ${payload.invoiceNumber} for ${payload.amount} is confirmed.`,
    html: buildEmailShell(body, `Invoice ${payload.invoiceNumber} confirmed — ${payload.amount} for ${payload.plan} plan.`, siteUrl),
  });
}

// ─────────────────────────────────────────────
// 6. Invoice – Top-Up
// ─────────────────────────────────────────────

export async function sendTopUpInvoiceEmail(
  user: Partial<User>,
  payload: InvoiceTopUpPayload,
  siteUrl: string
) {
  const body = /* html */ `
    ${greeting(user)}
    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:20px;">
      Your credit top-up was successful. Your balance has been updated and the credits
      are ready to use immediately.
    </p>

    <!-- Invoice card -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
      style="background:#0f0f11;border:1px solid #2a2a33;border-radius:12px;overflow:hidden;margin-bottom:8px;">
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid #1e1e24;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td>
                <p style="font-size:11px;color:#55555f;text-transform:uppercase;letter-spacing:1px;">Invoice</p>
                <p style="font-size:15px;font-weight:600;color:#e8e8ec;font-family:'DM Mono',monospace;">${payload.invoiceNumber}</p>
              </td>
              <td style="text-align:right;">
                ${badge("TOP-UP", "#3a9e6f")}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tbody>
        ${infoRow("Credits Added", payload.creditsFormatted)}
        ${infoRow("Payment Method", payload.paymentMethod)}
        ${infoRow("Currency", payload.currency)}
        ${infoRow("Transaction ID", `<span style="font-family:'DM Mono',monospace;font-size:11px;">${payload.transaction.id.slice(0, 16)}…</span>`)}
        ${infoRow("Status", "✓ Paid")}
      </tbody>
      <tr>
        <td style="padding:14px 20px;background:#1a1a22;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="font-size:14px;color:#9898a6;font-weight:500;">Amount Paid</td>
              <td style="text-align:right;font-size:22px;font-weight:600;color:#e8e8ec;font-family:'DM Mono',monospace;">${payload.amountFormatted}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${payload.receiptUrl ? primaryButton("Download Receipt", payload.receiptUrl) : ""}

    ${divider()}
    <p style="font-size:13px;color:#55555f;line-height:1.6;">
      Need help with your purchase? <a href="${siteUrl}/contact" style="color:#7c6ef7;">Contact support</a>.
    </p>
  `;

  await sendMail({
    to: user?.email ?? "",
    subject: `Top-Up Confirmed ${payload.invoiceNumber} – Smart Boost Labs`,
    text: `Your top-up of ${payload.creditsFormatted} (${payload.amountFormatted}) is confirmed.`,
    html: buildEmailShell(body, `${payload.creditsFormatted} added to your account — invoice ${payload.invoiceNumber}`, siteUrl),
  });
}

// ─────────────────────────────────────────────
// 7. Suspicious Activity Alert
// ─────────────────────────────────────────────

const SUSPICIOUS_LABELS: Record<SuspiciousActivityType, string> = {
  login: "New Sign-In Detected",
  change_password: "Password Changed",
  change_email: "Email Address Changed",
  api_key_reset: "API Key Reset",
  two_factor_disabled: "Two-Factor Authentication Disabled",
  unknown: "Unusual Activity Detected",
};

const SUSPICIOUS_DESCRIPTIONS: Record<SuspiciousActivityType, string> = {
  login: "A sign-in to your account was detected from a new device or location.",
  change_password: "Your account password was recently changed.",
  change_email: "The email address on your account was recently changed.",
  api_key_reset: "Your API key was reset. Any integrations using the old key will no longer work.",
  two_factor_disabled: "Two-factor authentication was disabled on your account, reducing its security.",
  unknown: "Unusual activity was detected on your Smart Boost Labs account.",
};

export async function sendSuspiciousActivityEmail(
  user: Partial<User>,
  payload: SuspiciousActivityPayload,
  siteUrl: string
) {
  const label = SUSPICIOUS_LABELS[payload.type];
  const description = SUSPICIOUS_DESCRIPTIONS[payload.type];
  const timestamp = payload.timestamp.toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const body = /* html */ `
    ${greeting(user)}

    <!-- Alert banner -->
    <div style="background:#2d1a1a;border:1px solid #5a2a2a;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="font-size:13px;color:#e8633a;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">⚠ Security Alert</p>
      <p style="font-size:16px;font-weight:600;color:#f0b0a0;">${label}</p>
    </div>

    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:20px;">
      ${description} If this was you, no action is needed.
      If you don't recognize this activity, secure your account immediately.
    </p>

    <!-- Details -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
      style="background:#0f0f11;border:1px solid #2a2a33;border-radius:12px;overflow:hidden;margin-bottom:8px;">
      <tbody>
        ${infoRow("Activity", label)}
        ${infoRow("Time", timestamp)}
        ${infoRow("IP Address", `<span style="font-family:'DM Mono',monospace;">${payload.ip}</span>`)}
        ${payload.location ? infoRow("Country", payload.location.country || "Unknown") : ""}
        ${payload.location ? infoRow("City", payload.location.city || "Unknown") : ""}
        ${payload.location ? infoRow("Region", payload.location.region || "Unknown") : ""}
        ${payload.location ? infoRow("Postal Code", payload.location.zip || "Unknown") : ""}
        ${payload.location ? infoRow("Latitude", payload.location.lat || "Unknown") : ""}
        ${payload.location ? infoRow("Longitude", payload.location.lon || "Unknown") : ""}
        ${payload.userAgent ? infoRow("Device", payload.userAgent.substring(0, 48) + (payload.userAgent.length > 48 ? "…" : "")) : ""}
      </tbody>
    </table>

    ${warningButton("Secure My Account", payload.secureUrl)}

    ${divider()}
    <p style="font-size:13px;color:#55555f;line-height:1.6;">
      If this was you, you can safely ignore this alert.
      For any concerns, <a href="${siteUrl}/contact" style="color:#7c6ef7;">contact our security team</a>.
    </p>
  `;

  await sendMail({
    to: user?.email ?? "",
    subject: `Security Alert: ${label} – Smart Boost Labs`,
    text: `Security alert: ${label} detected on your account at ${timestamp} from IP ${payload.ip}. Secure your account: ${payload.secureUrl}`,
    html: buildEmailShell(body, `Security alert: ${label} detected on your account.`, siteUrl),
  });
}

// ─────────────────────────────────────────────
// 8. Insufficient Balance / Credit Limit Warning
// ─────────────────────────────────────────────

export async function sendInsufficientBalanceEmail(
  user: Partial<User>,
  payload: InsufficientBalancePayload,
  siteUrl: string
) {
  // Progress bar color based on usage
  const barColor =
    payload.usagePercent >= 95
      ? "#e8633a"
      : payload.usagePercent >= 80
        ? "#e8a33a"
        : "#7c6ef7";

  const barWidth = Math.min(payload.usagePercent, 100);

  const body = /* html */ `
    ${greeting(user)}

    <!-- Alert banner -->
    <div style="background:#2d2010;border:1px solid #5a4010;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="font-size:13px;color:#e8a33a;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">⚡ Balance Warning</p>
      <p style="font-size:16px;font-weight:600;color:#f0c880;">
        ${payload.usagePercent >= 100 ? "Your credits are fully used" : `You've used ${payload.usagePercent}% of your credits`}
      </p>
    </div>

    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:20px;">
      Your Smart Boost Labs credit balance is ${payload.usagePercent >= 100 ? "depleted" : "running low"}.
      Top up or upgrade your plan to continue uninterrupted service.
    </p>

    <!-- Usage bar -->
    <div style="background:#0f0f11;border:1px solid #2a2a33;border-radius:12px;padding:20px;margin-bottom:20px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="font-size:13px;color:#55555f;">Credit Usage</td>
          <td style="text-align:right;font-size:13px;font-weight:600;color:#e8e8ec;">${payload.creditBalance} / ${payload.creditLimit}</td>
        </tr>
      </table>
      <div style="background:#1e1e24;border-radius:999px;height:8px;margin-top:10px;overflow:hidden;">
        <div style="background:linear-gradient(90deg,${barColor},${barColor}cc);height:8px;width:${barWidth}%;border-radius:999px;"></div>
      </div>
      <p style="font-size:12px;color:${barColor};margin-top:8px;font-weight:500;">${payload.usagePercent}% used</p>
    </div>

    <!-- CTA row -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="padding-right:8px;" width="50%">
          <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
            <tr>
              <td style="border-radius:10px;background:linear-gradient(135deg,#7c6ef7,#5b4fe8);text-align:center;">
                <a href="${payload.topUpUrl}" style="display:block;padding:13px 16px;font-family:'DM Sans',Arial,sans-serif;font-size:14px;font-weight:600;color:#fff;">Top Up Credits</a>
              </td>
            </tr>
          </table>
        </td>
        <td style="padding-left:8px;" width="50%">
          <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
            <tr>
              <td style="border-radius:10px;border:1px solid #3a3a48;text-align:center;">
                <a href="${payload.upgradeUrl}" style="display:block;padding:13px 16px;font-family:'DM Sans',Arial,sans-serif;font-size:14px;font-weight:600;color:#e8e8ec;">Upgrade Plan</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${divider()}
    <p style="font-size:13px;color:#55555f;line-height:1.6;">
      Need help choosing a plan? <a href="${siteUrl}?#pricing" style="color:#7c6ef7;">View our pricing page</a> or
      <a href="${siteUrl}/contact" style="color:#7c6ef7;">contact support</a>.
    </p>
  `;

  await sendMail({
    to: user?.email ?? "",
    subject: payload.usagePercent >= 100
      ? "Your credits are depleted – Smart Boost Labs"
      : `Low balance alert (${payload.usagePercent}% used) – Smart Boost Labs`,
    text: `Your credit balance is low: ${payload.creditBalance} remaining of ${payload.creditLimit}. Top up at ${payload.topUpUrl} or upgrade at ${payload.upgradeUrl}.`,
    html: buildEmailShell(body, `You've used ${payload.usagePercent}% of your Smart Boost Labs credits.`, siteUrl),
  });
}

type CampaignStatus =
  | "draft"
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

interface CampaignBase {
  id: string;
  name: string;
  targetUrl: string;
  status: CampaignStatus;
  dailyLimit: number;
  totalLimit?: number | null;
  totalSessions: number;
  successCount: number;
  failCount: number;
  todayCount: number;
  createdAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
}

interface CampaignStatusPayload {
  campaign: CampaignBase;
  /** URL to view campaign detail in dashboard */
  campaignUrl: string;
  /** Optional human-readable reason (e.g. for failed/cancelled) */
  reason?: string;
  /** Optional next steps hint */
  hint?: string;
}

// ─────────────────────────────────────────────
// Campaign Partials
// ─────────────────────────────────────────────

const CAMPAIGN_STATUS_META: Record<
  CampaignStatus,
  { label: string; color: string; bg: string; icon: string; desc: string }
> = {
  draft: {
    label: "Draft",
    color: "#55555f",
    bg: "#1e1e24",
    icon: "✏️",
    desc: "Your campaign has been saved as a draft.",
  },
  queued: {
    label: "Queued",
    color: "#7c6ef7",
    bg: "#1e1a2e",
    icon: "⏳",
    desc: "Your campaign is in the queue and will start shortly.",
  },
  running: {
    label: "Running",
    color: "#3a9e6f",
    bg: "#1a2e22",
    icon: "▶",
    desc: "Your campaign is actively running and sending traffic.",
  },
  paused: {
    label: "Paused",
    color: "#e8a33a",
    bg: "#2d2010",
    icon: "⏸",
    desc: "Your campaign has been paused.",
  },
  completed: {
    label: "Completed",
    color: "#3a9e6f",
    bg: "#1a2e22",
    icon: "✓",
    desc: "Your campaign has finished successfully.",
  },
  failed: {
    label: "Failed",
    color: "#e8633a",
    bg: "#2d1a1a",
    icon: "✕",
    desc: "Your campaign encountered an error and could not continue.",
  },
  cancelled: {
    label: "Cancelled",
    color: "#55555f",
    bg: "#1a1a20",
    icon: "⊘",
    desc: "Your campaign has been cancelled.",
  },
};

function campaignStatsBanner(campaign: CampaignBase): string {
  const successRate =
    campaign.totalSessions > 0
      ? Math.round((campaign.successCount / campaign.totalSessions) * 100)
      : 0;

  return /* html */ `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:#0f0f11;border:1px solid #2a2a33;border-radius:12px;overflow:hidden;margin:20px 0;">
    <tr>
      <td style="padding:8px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="padding:12px 20px;text-align:center;border-right:1px solid #1e1e24;">
              <p style="font-size:11px;color:#55555f;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Total Sessions</p>
              <p style="font-size:22px;font-weight:600;color:#e8e8ec;font-family:'DM Mono',monospace;">${campaign.totalSessions.toLocaleString()}</p>
            </td>
            <td style="padding:12px 20px;text-align:center;border-right:1px solid #1e1e24;">
              <p style="font-size:11px;color:#55555f;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Success</p>
              <p style="font-size:22px;font-weight:600;color:#3a9e6f;font-family:'DM Mono',monospace;">${campaign.successCount.toLocaleString()}</p>
            </td>
            <td style="padding:12px 20px;text-align:center;border-right:1px solid #1e1e24;">
              <p style="font-size:11px;color:#55555f;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Failed</p>
              <p style="font-size:22px;font-weight:600;color:#e8633a;font-family:'DM Mono',monospace;">${campaign.failCount.toLocaleString()}</p>
            </td>
            <td style="padding:12px 20px;text-align:center;">
              <p style="font-size:11px;color:#55555f;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Success Rate</p>
              <p style="font-size:22px;font-weight:600;color:#7c6ef7;font-family:'DM Mono',monospace;">${successRate}%</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

function campaignInfoTable(campaign: CampaignBase): string {
  const fmt = (d: Date) =>
    d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  return /* html */ `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:#0f0f11;border:1px solid #2a2a33;border-radius:12px;overflow:hidden;margin-bottom:4px;">
    <tbody>
      ${infoRow("Campaign ID", `<span style="font-family:'DM Mono',monospace;font-size:11px;">${campaign.id.slice(0, 18)}…</span>`)}
      ${infoRow("Target URL", `<span style="font-family:'DM Mono',monospace;font-size:11px;word-break:break-all;">${campaign.targetUrl.length > 40 ? campaign.targetUrl.slice(0, 40) + "…" : campaign.targetUrl}</span>`)}
      ${infoRow("Daily Limit", campaign.dailyLimit.toLocaleString())}
      ${campaign.totalLimit != null ? infoRow("Total Limit", campaign.totalLimit.toLocaleString()) : ""}
      ${infoRow("Today's Sessions", campaign.todayCount.toLocaleString())}
      ${campaign.startedAt ? infoRow("Started At", fmt(campaign.startedAt)) : ""}
      ${campaign.completedAt ? infoRow("Completed At", fmt(campaign.completedAt)) : ""}
      ${infoRow("Created At", fmt(campaign.createdAt))}
    </tbody>
  </table>`;
}

// ─────────────────────────────────────────────
// 9. Campaign: Queued
// ─────────────────────────────────────────────

export async function sendCampaignQueuedEmail(user: Partial<User>, payload: CampaignStatusPayload, siteUrl: string) {
  const meta = CAMPAIGN_STATUS_META.queued;

  const body = /* html */ `
    ${greeting(user)}
    <div style="background:${meta.bg};border:1px solid ${meta.color}33;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="font-size:13px;color:${meta.color};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${meta.icon} ${meta.label}</p>
      <p style="font-size:16px;font-weight:600;color:#e8e8ec;">${payload.campaign.name}</p>
    </div>
    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:4px;">
      ${meta.desc} We'll send you another notification as soon as it starts.
    </p>
    ${campaignInfoTable(payload.campaign)}
    ${primaryButton("View Campaign", payload.campaignUrl)}
    ${divider()}
    <p style="font-size:13px;color:#55555f;line-height:1.6;">
      Questions? <a href="${siteUrl}/contact" style="color:#7c6ef7;">Contact support</a>.
    </p>
  `;

  await sendMail({
    to: user.email || '',
    subject: `Campaign queued: ${payload.campaign.name} – Smart Boost Labs`,
    text: `Your campaign "${payload.campaign.name}" has been queued. View it at ${payload.campaignUrl}`,
    html: buildEmailShell(body, `"${payload.campaign.name}" is queued and will start soon.`, siteUrl),
  });
}

// ─────────────────────────────────────────────
// 10. Campaign: Started / Running
// ─────────────────────────────────────────────

export async function sendCampaignStartedEmail(user: Partial<User>, payload: CampaignStatusPayload, siteUrl: string) {
  const meta = CAMPAIGN_STATUS_META.running;

  const body = /* html */ `
    ${greeting(user)}
    <div style="background:${meta.bg};border:1px solid ${meta.color}33;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="font-size:13px;color:${meta.color};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${meta.icon} ${meta.label}</p>
      <p style="font-size:16px;font-weight:600;color:#e8e8ec;">${payload.campaign.name}</p>
    </div>
    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:4px;">
      ${meta.desc} Traffic is now being directed to your target URL.
    </p>
    ${campaignInfoTable(payload.campaign)}
    ${primaryButton("Monitor Campaign", payload.campaignUrl)}
    ${divider()}
    <p style="font-size:13px;color:#55555f;line-height:1.6;">
      You can pause or stop the campaign at any time from your
      <a href="${payload.campaignUrl}" style="color:#7c6ef7;">dashboard</a>.
    </p>
  `;

  await sendMail({
    to: user.email || '',
    subject: `Campaign started: ${payload.campaign.name} – Smart Boost Labs`,
    text: `Your campaign "${payload.campaign.name}" is now running. Monitor it at ${payload.campaignUrl}`,
    html: buildEmailShell(body, `"${payload.campaign.name}" is now live and sending traffic.`, siteUrl),
  });
}

// ─────────────────────────────────────────────
// 11. Campaign: Paused
// ─────────────────────────────────────────────

export async function sendCampaignPausedEmail(user: Partial<User>, payload: CampaignStatusPayload, siteUrl: string) {
  const meta = CAMPAIGN_STATUS_META.paused;

  const body = /* html */ `
    ${greeting(user)}
    <div style="background:${meta.bg};border:1px solid ${meta.color}33;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="font-size:13px;color:${meta.color};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${meta.icon} ${meta.label}</p>
      <p style="font-size:16px;font-weight:600;color:#e8e8ec;">${payload.campaign.name}</p>
    </div>
    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:4px;">
      ${meta.desc} Your progress has been saved — you can resume it at any time.
      ${payload.reason ? `<br/><br/><strong style="color:#e8e8ec;">Reason:</strong> ${payload.reason}` : ""}
    </p>
    ${campaignStatsBanner(payload.campaign)}
    ${campaignInfoTable(payload.campaign)}
    ${primaryButton("Resume Campaign", payload.campaignUrl)}
    ${divider()}
    <p style="font-size:13px;color:#55555f;line-height:1.6;">
      Need help? <a href="${siteUrl}/contact" style="color:#7c6ef7;">Contact support</a>.
    </p>
  `;

  await sendMail({
    to: user.email || '',
    subject: `Campaign paused: ${payload.campaign.name} – Smart Boost Labs`,
    text: `Your campaign "${payload.campaign.name}" has been paused. Resume it at ${payload.campaignUrl}`,
    html: buildEmailShell(body, `"${payload.campaign.name}" has been paused. Resume whenever you're ready.`, siteUrl),
  });
}

// ─────────────────────────────────────────────
// 12. Campaign: Completed
// ─────────────────────────────────────────────

export async function sendCampaignCompletedEmail(user: Partial<User>, payload: CampaignStatusPayload, siteUrl: string) {
  const meta = CAMPAIGN_STATUS_META.completed;
  const successRate =
    payload.campaign.totalSessions > 0
      ? Math.round((payload.campaign.successCount / payload.campaign.totalSessions) * 100)
      : 0;

  const body = /* html */ `
    ${greeting(user)}
    <div style="background:${meta.bg};border:1px solid ${meta.color}33;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="font-size:13px;color:${meta.color};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${meta.icon} ${meta.label}</p>
      <p style="font-size:16px;font-weight:600;color:#e8e8ec;">${payload.campaign.name}</p>
    </div>
    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:4px;">
      ${meta.desc} Here's a summary of your campaign performance.
    </p>
    ${campaignStatsBanner(payload.campaign)}
    ${campaignInfoTable(payload.campaign)}

    <!-- Performance note -->
    ${successRate >= 80 ? `
    <div style="background:#1a2e22;border:1px solid #2d4a2d;border-radius:10px;padding:14px 18px;margin-top:4px;margin-bottom:8px;">
      <p style="font-size:13px;color:#6fcf6f;font-weight:500;">🎉 Great performance! Your campaign achieved a ${successRate}% success rate.</p>
    </div>` : successRate >= 50 ? `
    <div style="background:#2d2010;border:1px solid #5a4010;border-radius:10px;padding:14px 18px;margin-top:4px;margin-bottom:8px;">
      <p style="font-size:13px;color:#e8a33a;font-weight:500;">📊 Your campaign achieved a ${successRate}% success rate. Consider adjusting your settings for better results.</p>
    </div>` : `
    <div style="background:#2d1a1a;border:1px solid #5a2a2a;border-radius:10px;padding:14px 18px;margin-top:4px;margin-bottom:8px;">
      <p style="font-size:13px;color:#e8633a;font-weight:500;">⚠ Low success rate (${successRate}%). Review your campaign config or <a href="${siteUrl}/contact" style="color:#e8633a;">contact support</a>.</p>
    </div>`}

    ${primaryButton("View Full Report", payload.campaignUrl)}
    ${divider()}
    <p style="font-size:13px;color:#55555f;line-height:1.6;">
      Ready for another run? <a href="${siteUrl}/app/campaigns/create" style="color:#7c6ef7;">Create a new campaign</a> or duplicate this one from your dashboard.
    </p>
  `;

  await sendMail({
    to: user.email || '',
    subject: `Campaign completed: ${payload.campaign.name} – Smart Boost Labs`,
    text: `Your campaign "${payload.campaign.name}" has completed. ${payload.campaign.totalSessions} sessions, ${successRate}% success rate. View report: ${payload.campaignUrl}`,
    html: buildEmailShell(body, `"${payload.campaign.name}" finished — ${payload.campaign.totalSessions.toLocaleString()} sessions, ${successRate}% success.`, siteUrl),
  });
}

// ─────────────────────────────────────────────
// 13. Campaign: Failed
// ─────────────────────────────────────────────

export async function sendCampaignFailedEmail(user: Partial<User>, payload: CampaignStatusPayload, siteUrl: string) {
  const meta = CAMPAIGN_STATUS_META.failed;

  const body = /* html */ `
    ${greeting(user)}
    <div style="background:${meta.bg};border:1px solid ${meta.color}33;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="font-size:13px;color:${meta.color};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${meta.icon} ${meta.label}</p>
      <p style="font-size:16px;font-weight:600;color:#e8e8ec;">${payload.campaign.name}</p>
    </div>
    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:4px;">
      ${meta.desc}
      ${payload.reason ? `<br/><br/><strong style="color:#e8e8ec;">Error:</strong> ${payload.reason}` : ""}
    </p>
    ${payload.campaign.totalSessions > 0 ? campaignStatsBanner(payload.campaign) : ""}
    ${campaignInfoTable(payload.campaign)}
    ${payload.hint ? `
    <div style="background:#1a1a2e;border:1px solid #2a2a4a;border-radius:10px;padding:14px 18px;margin-top:4px;margin-bottom:8px;">
      <p style="font-size:13px;color:#9898cc;font-weight:500;">💡 Suggested fix: ${payload.hint}</p>
    </div>` : ""}
    ${warningButton("Retry Campaign", payload.campaignUrl)}
    ${divider()}
    <p style="font-size:13px;color:#55555f;line-height:1.6;">
      If the issue persists, please <a href="${siteUrl}/contact" style="color:#7c6ef7;">contact our support team</a> with your campaign ID.
    </p>
  `;

  await sendMail({
    to: user.email || '',
    subject: `Campaign failed: ${payload.campaign.name} – Smart Boost Labs`,
    text: `Your campaign "${payload.campaign.name}" has failed. ${payload.reason ?? ""} Retry at ${payload.campaignUrl}`,
    html: buildEmailShell(body, `"${payload.campaign.name}" encountered an error and has stopped.`, siteUrl),
  });
}

// ─────────────────────────────────────────────
// 14. Campaign: Cancelled
// ─────────────────────────────────────────────

export async function sendCampaignCancelledEmail(user: Partial<User>, payload: CampaignStatusPayload, siteUrl: string) {
  const meta = CAMPAIGN_STATUS_META.cancelled;

  const body = /* html */ `
    ${greeting(user)}
    <div style="background:${meta.bg};border:1px solid ${meta.color}33;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="font-size:13px;color:${meta.color};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${meta.icon} ${meta.label}</p>
      <p style="font-size:16px;font-weight:600;color:#e8e8ec;">${payload.campaign.name}</p>
    </div>
    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:4px;">
      Your campaign has been cancelled.
      ${payload.reason ? `<br/><br/><strong style="color:#e8e8ec;">Reason:</strong> ${payload.reason}` : ""}
    </p>
    ${payload.campaign.totalSessions > 0 ? campaignStatsBanner(payload.campaign) : ""}
    ${campaignInfoTable(payload.campaign)}
    ${primaryButton("Create New Campaign", `${siteUrl}/app/campaigns/create`)}
    ${divider()}
    <p style="font-size:13px;color:#55555f;line-height:1.6;">
      If you cancelled this by mistake or have questions, <a href="${siteUrl}/contact" style="color:#7c6ef7;">contact support</a>.
    </p>
  `;

  await sendMail({
    to: user.email || '',
    subject: `Campaign cancelled: ${payload.campaign.name} – Smart Boost Labs`,
    text: `Your campaign "${payload.campaign.name}" has been cancelled. ${payload.reason ?? ""}`,
    html: buildEmailShell(body, `"${payload.campaign.name}" has been cancelled.`, siteUrl),
  });
}

// ─────────────────────────────────────────────
// 15. Campaign: Daily Limit Reached
// ─────────────────────────────────────────────

interface CampaignDailyLimitPayload {
  campaign: CampaignBase;
  campaignUrl: string;
  resetTime: string; // e.g. "00:00 UTC"
}

export async function sendCampaignDailyLimitEmail(
  user: Partial<User>,
  payload: CampaignDailyLimitPayload,
  siteUrl: string
) {
  const body = /* html */ `
    ${greeting(user)}
    <div style="background:#2d2010;border:1px solid #e8a33a33;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="font-size:13px;color:#e8a33a;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">⏱ Daily Limit Reached</p>
      <p style="font-size:16px;font-weight:600;color:#e8e8ec;">${payload.campaign.name}</p>
    </div>
    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:4px;">
      Your campaign has reached its daily session limit of
      <strong style="color:#e8e8ec;">${payload.campaign.dailyLimit.toLocaleString()} sessions</strong>.
      It will automatically resume at <strong style="color:#e8e8ec;">${payload.resetTime}</strong> when the daily counter resets.
    </p>
    ${campaignStatsBanner(payload.campaign)}
    ${campaignInfoTable(payload.campaign)}
    ${primaryButton("Adjust Daily Limit", payload.campaignUrl)}
    ${divider()}
    <p style="font-size:13px;color:#55555f;line-height:1.6;">
      To send more traffic today, you can increase the daily limit from your
      <a href="${payload.campaignUrl}" style="color:#7c6ef7;">campaign settings</a>.
    </p>
  `;

  await sendMail({
    to: user.email || '',
    subject: `Daily limit reached: ${payload.campaign.name} – Smart Boost Labs`,
    text: `Campaign "${payload.campaign.name}" reached its daily limit of ${payload.campaign.dailyLimit} sessions. It resumes at ${payload.resetTime}.`,
    html: buildEmailShell(body, `"${payload.campaign.name}" has hit its daily session limit and will resume at ${payload.resetTime}.`, siteUrl),
  });
}

// ─────────────────────────────────────────────
// 16. Campaign: Total Limit Reached (auto-completed)
// ─────────────────────────────────────────────

export async function sendCampaignTotalLimitEmail(user: Partial<User>, payload: CampaignStatusPayload, siteUrl: string) {
  const successRate =
    payload.campaign.totalSessions > 0
      ? Math.round((payload.campaign.successCount / payload.campaign.totalSessions) * 100)
      : 0;

  const body = /* html */ `
    ${greeting(user)}
    <div style="background:#1a2e22;border:1px solid #3a9e6f33;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="font-size:13px;color:#3a9e6f;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">✓ Total Limit Reached</p>
      <p style="font-size:16px;font-weight:600;color:#e8e8ec;">${payload.campaign.name}</p>
    </div>
    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:4px;">
      Your campaign has reached its total session limit of
      <strong style="color:#e8e8ec;">${payload.campaign.totalLimit?.toLocaleString()} sessions</strong>
      and has been automatically completed.
    </p>
    ${campaignStatsBanner(payload.campaign)}
    ${campaignInfoTable(payload.campaign)}
    ${primaryButton("View Full Report", payload.campaignUrl)}
    ${divider()}
    <p style="font-size:13px;color:#55555f;line-height:1.6;">
      Want to continue? <a href="${siteUrl}/app/campaigns/create" style="color:#7c6ef7;">Create a new campaign</a>
      or increase the total limit and restart from your dashboard.
    </p>
  `;

  await sendMail({
    to: user.email || '',
    subject: `Total limit reached: ${payload.campaign.name} – Smart Boost Labs`,
    text: `Campaign "${payload.campaign.name}" reached its total limit of ${payload.campaign.totalLimit} sessions with a ${successRate}% success rate.`,
    html: buildEmailShell(body, `"${payload.campaign.name}" hit its total session limit and is now complete.`, siteUrl),
  });
}

// ─────────────────────────────────────────────
// Convenience: dispatch by status
// ─────────────────────────────────────────────

/**
 * Single entry point — dispatches the correct email based on campaign.status.
 * Use this in your webhook/event handler instead of calling individual helpers.
 *
 * @example
 * await dispatchCampaignStatusEmail(user, {
 *   campaign,
 *   campaignUrl: `https://smartboostlabs.com/campaigns/${campaign.id}`,
 *   reason: "Proxy pool exhausted",
 *   hint: "Try switching to a different provider in campaign settings.",
 * });
 */
export async function dispatchCampaignStatusEmail(
  user: Partial<User>,
  payload: CampaignStatusPayload,
  siteUrl: string
): Promise<void> {
  switch (payload.campaign.status) {
    case "queued":
      return sendCampaignQueuedEmail(user, payload, siteUrl);
    case "running":
      return sendCampaignStartedEmail(user, payload, siteUrl);
    case "paused":
      return sendCampaignPausedEmail(user, payload, siteUrl);
    case "completed":
      return sendCampaignCompletedEmail(user, payload, siteUrl);
    case "failed":
      return sendCampaignFailedEmail(user, payload, siteUrl);
    case "cancelled":
      return sendCampaignCancelledEmail(user, payload, siteUrl);
    default:
      // draft — no email sent
      break;
  }
}

export async function sendSuspendAccountEmail(user: Partial<User>, siteUrl: string) {
  const body = /* html */ `
    ${greeting(user)}
    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:8px;">
     We would like to inform you that your account with email ${user.email} has been temporarily disabled.
    </p>
    <p>
     If you need further assistance, please contact our support team.
    </p>
     ${divider()}
    ${primaryButton("Contact Support", `${siteUrl}/contact`)}
  `;

  await sendMail({
    to: user?.email ?? "",
    subject: `IMPORTANT: Notice of Your Account Suspension - Smart Boost Labs`,
    text: `Your account with email ${user.email} has been temporarily disabled.`,
    html: buildEmailShell(body, "", siteUrl),
  });
}

export async function sendAccountDeletingRequestEmail(user: Partial<User>, siteUrl: string) {
  const body = /* html */ `
    ${greeting(user)}
    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:8px;">
     As per your request, we would like to confirm that your account on Smart Boost Labs has been successfully deleted.
    </p>
     <p>
    All personal data, preferences, and history associated with your account have been removed from our systems in accordance with our privacy policy. We're sad to see you go, but if you change your mind and want to rejoin us in the future, you can always create a new account.
    </p>
    ${divider()}
    ${primaryButton("Contact Support", `${siteUrl}/contact`)}
  `;

  await sendMail({
    to: user?.email ?? "",
    subject: `Confirming Your Account Deletion - Smart Boost Labs`,
    text: `Your account with email ${user.email} has been successfully deleted.`,
    html: buildEmailShell(body, "", siteUrl),
  });
}

export async function sendPermanentlyDeleteAccountEmail(user: Partial<User>, siteUrl: string) {
  const body = /* html */ `
    ${greeting(user)}
    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:8px;">
     We are writing to inform you that your account with the email address ${user.email} has been deleted due to a violation of our Terms of Service related to suspicious activity or system tampering.
    </p>
     <p>
    This decision is final. All access to our services has been revoked, and associated data cannot be recovered. If you believe this is an error or have any questions, please contact our support team at ${siteUrl}/contact.
    </p>
    ${divider()}
    ${primaryButton("Contact Support", `${siteUrl}/contact`)}
  `;

  await sendMail({
    to: user?.email ?? "",
    subject: `Important Notice: Your Account Has Been Closed - Smart Boost Labs`,
    text: `We are writing to inform you that your account with the email address ${user.email} has been deleted due to a violation of our Terms of Service related to suspicious activity or system tampering.`,
    html: buildEmailShell(body, "", siteUrl),
  });
}

export async function sendContactSupportEmail(
  name: string,
  email: string,
  subject: string,
  message: string,
  payload: Partial<SuspiciousActivityPayload>,
  siteUrl: string,
  supportEmail: string
) {
  const timestamp = payload?.timestamp?.toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const body = /* html */ `
    <p style="font-size:15px;color:#9898a6;margin-bottom:8px;">Hello,</p>
    <h1 style="font-size:24px;font-weight:600;color:#e8e8ec;margin-bottom:20px;line-height:1.3;">Support Team 👋</h1>

    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:20px;">
      There's a new message coming in via the Contact Us form on the website! Here are the details:
    </p>

    <!-- Details -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
      style="background:#0f0f11;border:1px solid #2a2a33;border-radius:12px;overflow:hidden;margin-bottom:8px;">
      <tbody>
        ${infoRow("Name", name)}
        ${infoRow("Email", email)}
        ${infoRow("Subject", subject)}
        ${infoRow("IP Address", `<span style="font-family:'DM Mono',monospace;">${payload.ip}</span>`)}
        ${payload.location ? infoRow("Country", payload.location.country || "Unknown") : ""}
        ${payload.location ? infoRow("City", payload.location.city || "Unknown") : ""}
        ${payload.location ? infoRow("Region", payload.location.region || "Unknown") : ""}
        ${payload.location ? infoRow("Postal Code", payload.location.zip || "Unknown") : ""}
        ${payload.location ? infoRow("Latitude", payload.location.lat || "Unknown") : ""}
        ${payload.location ? infoRow("Longitude", payload.location.lon || "Unknown") : ""}
        ${payload.userAgent ? infoRow("Device", payload.userAgent.substring(0, 48) + (payload.userAgent.length > 48 ? "…" : "")) : ""}
      </tbody>
    </table>
    ${divider()}
    <p style="font-size:15px;color:#9898a6;margin-bottom:8px;">Message/Question:</p>
    <p style="font-size:15px;color:#9898a6;line-height:1.7;margin-bottom:20px;">
    ${message}
    </p>

    ${divider()}
    <p style="font-size:15px;color:#9898a6;margin-bottom:8px;">Action:</p>
    <p style="font-size:13px;color:#55555f;line-height:1.6;">
      Please respond to this request within 24 hours.
    </p>
  `;

  await sendMail({
    to: supportEmail,
    subject: `${subject} – Smart Boost Labs`,
    text: `New message from ${name} on your account at ${timestamp} from IP ${payload.ip}. Secure your account: ${payload.secureUrl}`,
    html: buildEmailShell(body, `New message from ${name} on ${subject} on your account.`, siteUrl),
  });
}

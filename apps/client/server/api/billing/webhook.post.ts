import { handleMidtrans, handleXendit, handlePaypal } from '~~/server/handler/billing'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const headers = getHeaders(event)

  // ── PayPal webhook ──────────────────────────────────────────
  if (headers['paypal-transmission-id'] && headers['paypal-transmission-sig']) {
    return handlePaypal(event)
  }

  // ── Midtrans webhook ────────────────────────────────────────
  if (headers['x-midtrans-signature'] || body?.signature_key) {
    return handleMidtrans(event)
  }

  // ── Xendit webhook ──────────────────────────────────────────
  if (headers['x-callback-token']) {
    return handleXendit(event)
  }

  throw createError({ statusCode: 400, message: 'Unknown webhook source' })
})


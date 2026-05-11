import { handleMidtrans, handleXendit } from '~~/server/handler/billing'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const headers = getHeaders(event)

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


export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    const status = (error as any)?.statusCode ?? 500
    if (status < 500) return

    const path = event?.path ?? 'unknown'
    const method = event?.method ?? 'unknown'
    const message = (error as any)?.message ?? String(error)

    console.error(`[Nitro] ${status} ${method} ${path}: ${message}`)
  })
})


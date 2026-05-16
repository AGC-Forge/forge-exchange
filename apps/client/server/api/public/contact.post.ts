import * as z from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().min(1, 'Email is required'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
})


export default defineEventHandler(async (event) => {

  try {
    const body = schema.safeParse(await readBody(event))
    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: 'Invalid request body',
        data: body.error.issues,
      })
    }

    const config = useRuntimeConfig()
    const { clientIp, userAgent, locationClient } = await getAllHeaderIdentifiers(event)

    try {
      await sendContactSupportEmail(
        body.data.name,
        body.data.email,
        body.data.subject,
        body.data.message,
        {
          ip: clientIp,
          userAgent,
          location: locationClient,
          timestamp: new Date(),
        },
        config.public.PUBLIC_SITE_URL,
        config.public.SUPPORT_EMAIL
      )

    } catch (error) {
      console.error(error)
    }

    setResponseStatus(event, 200)
    setSecurityHeaders(event)

    return {
      status: 200,
      success: true,
      message: 'Contact support email sent successfully',
    }

  } catch (error) {
    throw handleRequestError(error)
  }
})

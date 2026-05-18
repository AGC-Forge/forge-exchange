import { proxyCheckerHandler } from '~~/server/handler/proxy-checker';

export default defineEventHandler(async (event) => {
  try {

    const response = await proxyCheckerHandler(event);
    if (response instanceof H3Error) {
      return response;
    }

    setResponseStatus(event, 200);
    setSecurityHeaders(event);

    return {
      status: 200,
      ...response,
    }
  } catch (err) {
    throw handleRequestError(err);
  }
});

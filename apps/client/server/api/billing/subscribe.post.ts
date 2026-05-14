import { createSubscription } from "~~/server/handler/billing";

export default defineEventHandler(async (event) => {
  try {
    const response = await createSubscription(event);
    if (response instanceof H3Error) {
      throw response;
    }

    setResponseStatus(event, 201);
    setSecurityHeaders(event);

    return {
      status: 201,
      ...response,
    };
  } catch (error) {
    throw handleRequestError(error);
  }
});

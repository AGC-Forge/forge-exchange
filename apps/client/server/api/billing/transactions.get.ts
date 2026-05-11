import { transactions } from "~~/server/handler/billing";

export default defineEventHandler(async (event) => {
  try {
    const response = await transactions(event);
    if (response instanceof H3Error) {
      throw response;
    }

    setResponseStatus(event, 200);
    setSecurityHeaders(event);

    return {
      status: 200,
      ...response,
    };
  } catch (error) {
    throw handleRequestError(error);
  }
});

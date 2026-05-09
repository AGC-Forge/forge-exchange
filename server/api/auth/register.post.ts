import { registerHandler } from "~~/server/handler/auth";

export default defineEventHandler(async (event) => {
  try {
    const response = await registerHandler(event);
    if (response instanceof H3Error) throw response;

    setResponseStatus(event, 200);

    return {
      status: 200,
      ...response,
    };
  } catch (error) {
    throw handleRequestError(error);
  }
});

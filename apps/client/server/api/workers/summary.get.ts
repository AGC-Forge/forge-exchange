import { listWorkersSummary } from "~~/server/handler/workers";

export default defineEventHandler(async (event) => {
  try {
    const response = await listWorkersSummary(event);
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

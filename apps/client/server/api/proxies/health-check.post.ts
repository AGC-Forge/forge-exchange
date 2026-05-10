import { runBulkHealthCheck } from "~~/server/services/proxy-health";

export default defineEventHandler(async (event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session

    // Run async — tidak block response
    const result = await runBulkHealthCheck(user.id)

    setResponseStatus(event, 200);
    setSecurityHeaders(event);

    return {
      status: 200,
      success: true,
      message: `Health check completed: ${result.passed} active, ${result.failed} failed`,
      data: result,
    }
  } catch (error) {
    throw handleRequestError(error);
  }
});

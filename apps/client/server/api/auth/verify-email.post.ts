import { verifyEmailHandler } from "~~/server/handler/auth";

export default defineEventHandler(async (event) => {
  try {
    const response = await verifyEmailHandler(event);
    if (response instanceof H3Error) throw response;
    setResponseStatus(event, 200);
    return {
      status: 200,
      success: true,
      message: "Email verified successfully.",
    };
  } catch (error) {
    throw handleRequestError(error);
  }
});

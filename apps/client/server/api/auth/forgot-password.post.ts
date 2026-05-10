import { forgotHandler } from "~~/server/handler/auth";

export default defineEventHandler(async (event) => {
  try {
    const response = await forgotHandler(event);
    if (response instanceof H3Error) throw response;
    setResponseStatus(event, 200);
    return {
      status: 200,
      success: true,
      message: "Reset password email sent successfully.",
    };
  } catch (error) {
    throw handleRequestError(error);
  }
});

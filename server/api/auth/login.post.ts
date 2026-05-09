import { loginHandler } from "~~/server/handler/auth";

export default defineEventHandler(async (event) => {
  try {
    const response = await loginHandler(event);
    if (response instanceof H3Error) throw response;

    setResponseStatus(event, 200);

    return {
      status: 200,
      success: true,
      message: "Login successful.",
      ...response,
    };
  } catch (error) {
    throw handleRequestError(error);
  }
});

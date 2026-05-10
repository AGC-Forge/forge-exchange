import { getUserHandler } from "~~/server/handler/user";

export default defineEventHandler(async (event) => {
  try {
    const response = await getUserHandler(event);
    if (response instanceof H3Error) throw response;
    setResponseStatus(event, 200);
    return {
      status: 200,
      success: true,
      message: "User found successfully.",
      data: response,
    };
  } catch (error) {
    throw handleRequestError(error);
  }
});

import type { H3Event } from "h3";
import { H3Error } from "h3";

export const handleRequestError = (error: unknown) => {
  if (error instanceof H3Error) {
    return error;
  }
  return createError({
    statusCode: 500,
    statusMessage: "Server Error",
    data: {
      code: "SERVER_ERROR",
      message: "Server Error",
    },
  });
};

export const setSecurityHeaders = (event: H3Event): void => {
  setHeader(event, "Cache-Control", "no-store, max-age=0");
  setHeader(
    event,
    "CDN-Cache-Control",
    "max-age=60, stale-while-revalidate=300",
  );
};

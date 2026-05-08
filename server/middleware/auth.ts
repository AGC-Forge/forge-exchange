import { getRequestHeader, getRequestURL, sendRedirect } from "h3";

const publicApiPrefixes = ["/api/auth/", "/api/_auth/", "/api/public/settings"];
const guestPagePrefixes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];
const protectedPagePrefixes = ["/app/"];

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const path = url.pathname;

  if (path.startsWith("/api/")) {
    if (publicApiPrefixes.some((p) => path.startsWith(p))) return;

    const session = await getUserSession(event);
    if (session?.user) return;

    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  if (protectedPagePrefixes.some((p) => path.startsWith(p))) {
    const session = await getUserSession(event);
    if (session?.user) return;

    const accept = getRequestHeader(event, "accept") || "";
    const isHtml = accept.includes("text/html");
    if (!isHtml) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    const redirectTo = encodeURIComponent(path + url.search);
    return sendRedirect(event, `/login?redirect=${redirectTo}`);
  }

  if (guestPagePrefixes.some((p) => path.startsWith(p))) {
    const session = await getUserSession(event);
    if (!session?.user) return;

    const redirect = url.searchParams.get("redirect") || "/";
    return sendRedirect(event, redirect);
  }
});

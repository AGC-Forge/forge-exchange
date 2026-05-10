import { getRequestHeader, getRequestURL, sendRedirect } from "h3";
import type { UserRole } from "@prisma/client";

const publicApiPrefixes = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/resend-verification",
  "/api/auth/verify-email",
  "/api/_auth/",
  "/api/public/",
];
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
export function useServerAuth(event: any) {
  return {
    async getSession() {
      return requireUserSession(event);
    },

    async requireRole(minRole: UserRole) {
      const session = await requireUserSession(event);
      if (!hasMinRole(session.user.role?.name ?? "user", minRole)) {
        throw createError({
          statusCode: 403,
          statusMessage: "Forbidden",
          data: {
            success: false,
            error: { code: "FORBIDDEN", message: "Insufficient permission" },
          },
        });
      }
      return session;
    },

    async requirePermission(permission: Permission) {
      const session = await requireUserSession(event);
      if (!hasPermission(session.user.role?.name ?? "user", permission)) {
        throw createError({
          statusCode: 403,
          data: {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: `Access denied: ${permission}`,
            },
          },
        });
      }
      return session;
    },
  };
}

import type { H3Event } from "h3";

// Cache the event for use in non-event-context helpers
let _event: H3Event | null = null;
export function setResponseEvent(event: H3Event) {
  _event = event;
}

function currentEvent(): H3Event {
  if (_event) return _event;
  throw new Error(
    "setResponseEvent must be called before using response helpers outside of event context",
  );
}

// ──────────────────────────────────────────────
// API Response Helpers
// ──────────────────────────────────────────────

const DEFAULT_META: ApiMeta = {
  total: 0,
  limit: 0,
  offset: 0,
  has_more: false,
};

function buildMeta(meta?: Partial<ApiMeta>): ApiMeta {
  return {
    total: meta?.total ?? 0,
    limit: meta?.limit ?? 0,
    offset: meta?.offset ?? 0,
    has_more: meta?.has_more ?? false,
  };
}

/** 200 OK — success with data (no extra meta) */
export function ok<T = any>(data: T, message = "OK", statusCode = 200) {
  const body: ApiResponse<T> = {
    status: statusCode,
    success: true,
    message,
    data,
  };
  return createError({
    statusCode,
    data: body,
  });
}

/** 200 OK — success with pagination meta */
export function okPaginated<T = any>(
  data: T,
  meta: Partial<ApiMeta>,
  message = "OK",
) {
  return createError({
    statusCode: 200,
    data: {
      status: 200,
      success: true,
      message,
      data,
      meta: buildMeta(meta),
    } satisfies ApiResponse<T>,
  });
}

/** 201 Created */
export function created<T = any>(data: T, message = "Created") {
  return createError({
    statusCode: 201,
    data: {
      status: 201,
      success: true,
      message,
      data,
    } satisfies ApiResponse<T>,
  });
}

/** 204 No Content — success with no body */
export function noContent(event: H3Event) {
  setResponseStatus(event, 204);
  return null;
}

// ── Error helpers ──────────────────────────────────
export function apiFail(opts: ApiErrorOptions) {
  const {
    code,
    message,
    statusCode = 400,
    redirectUrl,
    details,
    fieldErrors,
    retryable,
  } = opts;

  return createError({
    statusCode,
    data: {
      status: statusCode,
      success: false,
      message: message ?? code,
      error: {
        code,
        message,
        redirect_url: redirectUrl,
        details,
        fieldErrors,
        retryable,
        timestamp: new Date().toISOString(),
      },
    } satisfies ApiResponse,
  });
}

/** Shortcut: 400 Bad Request */
export function badRequest(code: string, message: string) {
  return apiFail({ code, message, statusCode: 400 });
}

/** Shortcut: 401 Unauthorized */
export function unauthorized(code = "UNAUTHORIZED", message = "Unauthorized") {
  return apiFail({ code, message, statusCode: 401 });
}

/** Shortcut: 403 Forbidden */
export function forbidden(code = "FORBIDDEN", message = "Forbidden") {
  return apiFail({ code, message, statusCode: 403 });
}

/** Shortcut: 404 Not Found */
export function notFound(code = "NOT_FOUND", message = "Resource not found") {
  return apiFail({ code, message, statusCode: 404 });
}

/** Shortcut: 409 Conflict */
export function conflict(code: string, message: string) {
  return apiFail({ code, message, statusCode: 409 });
}

/** Shortcut: 422 Unprocessable Entity (validation) */
export function validationError(fieldErrors: FieldErrors) {
  return apiFail({
    code: "VALIDATION_ERROR",
    message: "Validation failed",
    statusCode: 422,
    fieldErrors,
  });
}

/** Shortcut: 429 Too Many Requests */
export function rateLimited(retryAfterMs?: number) {
  return apiFail({
    code: "RATE_LIMITED",
    message: "Too many requests",
    statusCode: 429,
    retryable: true,
  });
}

/** Shortcut: 500 Internal Server Error */
export function serverError(details?: any) {
  return apiFail({
    code: "INTERNAL_ERROR",
    message: "Internal server error",
    statusCode: 500,
    details,
    retryable: true,
  });
}

// ──────────────────────────────────────────────
// Prisma / generic error handler
// ──────────────────────────────────────────────

export function prismaError(err: any): ReturnType<typeof apiFail> {
  const meta = err?.meta ?? {};

  if (meta?.fieldErrors) {
    return validationError(meta.fieldErrors);
  }

  if (err?.code === "P2002") {
    const field = meta?.target?.join(", ") ?? "field";
    return conflict("DUPLICATE_ENTRY", `Duplicate value for ${field}`);
  }

  if (err?.code === "P2025") {
    return notFound("NOT_FOUND", "Record not found");
  }

  console.error("[PrismaError]", err);
  return serverError(
    process.env.NODE_ENV === "development" ? err.message : undefined,
  );
}

// ──────────────────────────────────────────────
// Zod error → fieldErrors
// ──────────────────────────────────────────────

export function zodError(issues: any[]): ReturnType<typeof apiFail> {
  const fieldErrors: FieldErrors = {};

  for (const issue of issues) {
    const path = issue.path.join(".") || "unknown";
    if (!fieldErrors[path]) fieldErrors[path] = [];
    fieldErrors[path].push(issue.message);
  }

  return validationError(fieldErrors);
}

// ──────────────────────────────────────────────
// Helpers already defined above
// ──────────────────────────────────────────────

const store = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}
export function getClientIp(event: any): string {
  return (
    getHeader(event, "x-forwarded-for")?.split(",")[0]?.trim() ||
    getHeader(event, "x-real-ip") ||
    "0.0.0.0"
  );
}

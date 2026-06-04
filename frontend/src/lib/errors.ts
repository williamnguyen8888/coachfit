// src/lib/errors.ts
// Shared error types for the CoachFit API client.
// ApiError mirrors the backend error envelope:
//   { "error": { "code": "NOT_FOUND", "message": "..." } }

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    /** Optional extra fields from the error response body (e.g. existingId for 409 DUPLICATE) */
    public readonly data?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Type-guard — narrows unknown catch values to ApiError */
export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/** Safe human-readable message from any thrown value */
export function getErrorMessage(e: unknown): string {
  if (isApiError(e)) return e.message;
  if (e instanceof Error) return e.message;
  return "An unexpected error occurred";
}

// Well-known backend error codes
export const ERROR_CODES = {
  TIER_CHANGED: "TIER_CHANGED",
  UPGRADE_REQUIRED: "UPGRADE_REQUIRED",
  DUPLICATE: "DUPLICATE",
  ALREADY_CONNECTED: "ALREADY_CONNECTED",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  // Must match GlobalExceptionHandler.java case 429
  RATE_LIMITED: "RATE_LIMIT_EXCEEDED",
  // Auth module errors
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS",
  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
  CONFLICT: "CONFLICT",
  // Domain errors
  INVALID_WORKOUT: "INVALID_WORKOUT",
  UNSUPPORTED_FORMAT: "UNSUPPORTED_FORMAT",
  PARSE_ERROR: "PARSE_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Every API error uses this envelope so clients can branch on `code`. */
export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    requestId?: string;
    details?: { path: string; message: string }[];
  };
}

export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'CSRF_FAILED'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_VERIFIED'
  | 'MFA_REQUIRED'
  | 'MFA_INVALID'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_DEACTIVATED'
  | 'SESSION_REVOKED'
  | 'NOT_CONFIGURED'
  | 'INTERNAL';

/** Cursor pagination: `nextCursor` is opaque and null on the last page. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

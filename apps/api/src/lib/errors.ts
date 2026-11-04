import type { ErrorCode } from '@vyro/types';

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, details?: { path: string; message: string }[]) =>
  new AppError(400, 'VALIDATION_FAILED', message, details);
export const unauthenticated = (message = 'Sign in to continue', code: ErrorCode = 'UNAUTHENTICATED') =>
  new AppError(401, code, message);
export const forbidden = (message = 'You do not have permission to do that', code: ErrorCode = 'FORBIDDEN') =>
  new AppError(403, code, message);
export const notFound = (message = 'Not found') => new AppError(404, 'NOT_FOUND', message);
export const conflict = (message: string) => new AppError(409, 'CONFLICT', message);
export const notConfigured = (what: string) =>
  new AppError(503, 'NOT_CONFIGURED', `${what} is not configured on this server`);

import type { RequestHandler, Response } from 'express';
import { randomToken, safeEqual } from '../lib/crypto.js';
import { AppError } from '../lib/errors.js';

export const CSRF_COOKIE = 'vyro_csrf';
export const CSRF_HEADER = 'x-csrf-token';

/** Double-submit token: readable cookie + matching header. Issued alongside the refresh cookie. */
export function issueCsrfCookie(res: Response, opts: { secure: boolean; domain?: string; maxAgeMs: number }) {
  res.cookie(CSRF_COOKIE, randomToken(24), {
    httpOnly: false,
    secure: opts.secure,
    sameSite: 'lax',
    domain: opts.domain || undefined,
    path: '/',
    maxAge: opts.maxAgeMs,
  });
}

/**
 * Only cookie-authenticated requests are CSRF-exposed. Requests that do not
 * carry the refresh cookie (native apps, bearer-only calls) pass through.
 */
export const requireCsrfForCookie =
  (cookieName: string): RequestHandler =>
  (req, _res, next) => {
    if (!req.cookies?.[cookieName]) return next();
    const cookie = req.cookies[CSRF_COOKIE];
    const header = req.get(CSRF_HEADER);
    if (typeof cookie !== 'string' || !header || !safeEqual(cookie, header)) {
      throw new AppError(403, 'CSRF_FAILED', 'Security check failed. Refresh the page and try again.');
    }
    next();
  };

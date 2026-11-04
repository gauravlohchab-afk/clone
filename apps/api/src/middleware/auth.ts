import type { RequestHandler } from 'express';
import type { UserRole } from '@vyro/types';
import type { AppContext } from '../context.js';
import { forbidden, unauthenticated } from '../lib/errors.js';
import { Session } from '../modules/auth/session.model.js';
import { User } from '../modules/users/user.model.js';

export interface AuthState {
  userId: string;
  sessionId: string;
  role: UserRole;
  emailVerified: boolean;
}

function bearer(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/**
 * Verifies the access token AND that its session is still live, so revoking a
 * session (logout, password reset, suspension) takes effect immediately.
 */
export function authenticate(ctx: AppContext, { required }: { required: boolean }): RequestHandler {
  return async (req, _res, next) => {
    const token = bearer(req.get('authorization'));
    if (!token) {
      if (required) throw unauthenticated();
      return next();
    }
    const claims = await ctx.jwt.verifyAccess(token);
    const session = await Session.findById(claims.sid, { userId: 1, revokedAt: 1, expiresAt: 1 }).lean();
    if (!session || session.revokedAt || session.expiresAt < new Date() || String(session.userId) !== claims.sub) {
      throw unauthenticated('This session has ended', 'SESSION_REVOKED');
    }
    const user = await User.findById(claims.sub, { role: 1, status: 1, emailVerifiedAt: 1 }).lean();
    if (!user) throw unauthenticated('This session has ended', 'SESSION_REVOKED');
    if (user.status === 'suspended' || user.status === 'banned') {
      throw forbidden('This account has been suspended', 'ACCOUNT_SUSPENDED');
    }
    req.auth = { userId: claims.sub, sessionId: claims.sid, role: user.role, emailVerified: !!user.emailVerifiedAt };
    next();
  };
}

export const requireVerifiedEmail: RequestHandler = (req, _res, next) => {
  if (!req.auth) throw unauthenticated();
  if (!req.auth.emailVerified) throw forbidden('Verify your email address first', 'EMAIL_NOT_VERIFIED');
  next();
};

const rank: Record<UserRole, number> = { user: 0, moderator: 1, admin: 2, superadmin: 3 };
/** Role checks always use the role loaded from the database, never a client claim. */
export const requireRole =
  (min: UserRole): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) throw unauthenticated();
    if (rank[req.auth.role] < rank[min]) throw forbidden();
    next();
  };

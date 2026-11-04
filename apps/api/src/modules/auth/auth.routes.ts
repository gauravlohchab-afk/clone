import { Router } from 'express';
import {
  changePasswordSchema, forgotPasswordSchema, googleLoginSchema, loginSchema, mfaCodeSchema, mfaDisableSchema,
  mfaLoginSchema, paginationQuery, objectId, refreshSchema, registerSchema, resendVerificationSchema,
  resetPasswordSchema, usernameAvailabilitySchema, verifyEmailSchema,
} from '@vyro/validation';
import type { AppContext } from '../../context.js';
import { authenticate } from '../../middleware/auth.js';
import { requireCsrfForCookie } from '../../middleware/csrf.js';
import { limiter } from '../../middleware/rate-limit.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { createAuthController, REFRESH_COOKIE } from './auth.controller.js';
import { createAuthService } from './auth.service.js';

export function authRoutes(ctx: AppContext) {
  const r = Router();
  const c = createAuthController(ctx, createAuthService(ctx));
  const requireAuth = authenticate(ctx, { required: true });
  const optionalAuth = authenticate(ctx, { required: false });
  const csrf = requireCsrfForCookie(REFRESH_COOKIE);
  const minute = 60_000;

  const credentialLimiter = limiter(ctx, 'login', { windowMs: 15 * minute, limit: 10, keyBy: 'ip+identifier' });
  const ipAuthLimiter = limiter(ctx, 'auth-ip', { windowMs: 15 * minute, limit: 100 });
  const emailLimiter = limiter(ctx, 'email', { windowMs: 60 * minute, limit: 5, keyBy: 'ip+identifier' });
  const mfaLimiter = limiter(ctx, 'mfa', { windowMs: 15 * minute, limit: 10 });
  const usernameLimiter = limiter(ctx, 'username', { windowMs: minute, limit: 60 });

  r.post('/register', ipAuthLimiter, limiter(ctx, 'register', { windowMs: 60 * minute, limit: 10 }), validateBody(registerSchema), c.register);
  r.post('/login', ipAuthLimiter, credentialLimiter, validateBody(loginSchema), c.login);
  r.post('/login/mfa', ipAuthLimiter, mfaLimiter, validateBody(mfaLoginSchema), c.loginMfa);
  r.post('/google', ipAuthLimiter, validateBody(googleLoginSchema), c.google);
  r.post('/refresh', limiter(ctx, 'refresh', { windowMs: minute, limit: 30 }), csrf, validateBody(refreshSchema), c.refresh);
  r.post('/logout', csrf, optionalAuth, validateBody(refreshSchema), c.logout);
  r.post('/logout-all', requireAuth, c.logoutAll);

  r.post('/verify-email', ipAuthLimiter, validateBody(verifyEmailSchema), c.verifyEmail);
  r.post('/resend-verification', emailLimiter, validateBody(resendVerificationSchema), c.resendVerification);
  r.post('/forgot-password', emailLimiter, validateBody(forgotPasswordSchema), c.forgotPassword);
  r.post('/reset-password', ipAuthLimiter, validateBody(resetPasswordSchema), c.resetPassword);
  r.post('/password', requireAuth, credentialLimiter, validateBody(changePasswordSchema), c.changePassword);
  r.get('/username-availability', usernameLimiter, optionalAuth, validateQuery(usernameAvailabilitySchema), c.usernameAvailability);

  r.get('/sessions', requireAuth, c.sessions);
  r.delete('/sessions/:id', requireAuth, (req, _res, next) => { objectId.parse(req.params.id); next(); }, c.revokeSession);
  r.get('/login-activity', requireAuth, validateQuery(paginationQuery), c.loginActivity);

  r.post('/mfa/setup', requireAuth, c.mfaSetup);
  r.post('/mfa/enable', requireAuth, mfaLimiter, validateBody(mfaCodeSchema), c.mfaEnable);
  r.post('/mfa/disable', requireAuth, mfaLimiter, validateBody(mfaDisableSchema), c.mfaDisable);
  r.post('/mfa/recovery-codes', requireAuth, mfaLimiter, validateBody(mfaCodeSchema), c.mfaRecoveryCodes);

  return r;
}

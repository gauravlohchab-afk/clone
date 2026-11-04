import type { Request, Response } from 'express';
import type { AuthSuccess, LoginResult } from '@vyro/types';
import type { AppContext } from '../../context.js';
import { unauthenticated } from '../../lib/errors.js';
import { cursorFilter, toPage } from '../../lib/cursor.js';
import { CSRF_COOKIE, issueCsrfCookie } from '../../middleware/csrf.js';
import { toLoginActivityDto, toSessionDto } from '../users/users.mapper.js';
import { checkUsername } from '../users/users.service.js';
import type { AuthService, ClientInfo } from './auth.service.js';

export const REFRESH_COOKIE = 'vyro_rt';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

export function clientInfo(req: Request): ClientInfo {
  const declared = (req.body?.platform ?? req.get('x-client-platform') ?? 'web') as string;
  const platform = declared === 'ios' || declared === 'android' ? declared : 'web';
  return { ip: req.ip ?? '', userAgent: req.get('user-agent') ?? '', platform, deviceName: req.body?.deviceName };
}

export function createAuthController(ctx: AppContext, auth: AuthService) {
  const cookieBase = {
    httpOnly: true,
    secure: ctx.env.COOKIE_SECURE,
    sameSite: 'strict' as const,
    domain: ctx.env.COOKIE_DOMAIN || undefined,
    path: REFRESH_COOKIE_PATH,
  };
  const maxAgeMs = ctx.env.REFRESH_TOKEN_TTL_DAYS * 24 * 3600_000;

  /** Web gets the refresh token as an httpOnly cookie only; native apps get it in the body. */
  function sendAuth(req: Request, res: Response, result: LoginResult, status = 200) {
    if (result.status !== 'authenticated') return res.status(status).json(result);
    if (clientInfo(req).platform === 'web') {
      res.cookie(REFRESH_COOKIE, result.refreshToken, { ...cookieBase, maxAge: maxAgeMs });
      issueCsrfCookie(res, { secure: ctx.env.COOKIE_SECURE, domain: ctx.env.COOKIE_DOMAIN, maxAgeMs });
      const { refreshToken: _omit, ...rest } = result as AuthSuccess;
      return res.status(status).json(rest);
    }
    return res.status(status).json(result);
  }

  function clearAuthCookies(res: Response) {
    res.clearCookie(REFRESH_COOKIE, cookieBase);
    res.clearCookie(CSRF_COOKIE, { path: '/', domain: ctx.env.COOKIE_DOMAIN || undefined });
  }

  const refreshTokenFrom = (req: Request): string | undefined =>
    (req.body?.refreshToken as string | undefined) ?? (req.cookies?.[REFRESH_COOKIE] as string | undefined);

  const userId = (req: Request) => req.auth!.userId;

  return {
    register: async (req: Request, res: Response) => sendAuth(req, res, await auth.register(req.body, clientInfo(req)), 201),
    login: async (req: Request, res: Response) => sendAuth(req, res, await auth.login(req.body, clientInfo(req))),
    loginMfa: async (req: Request, res: Response) => sendAuth(req, res, await auth.loginMfa(req.body, clientInfo(req))),
    google: async (req: Request, res: Response) => sendAuth(req, res, await auth.loginWithGoogle(req.body, clientInfo(req))),

    refresh: async (req: Request, res: Response) => {
      const token = refreshTokenFrom(req);
      if (!token) throw unauthenticated('Sign in to continue');
      try {
        return sendAuth(req, res, await auth.refresh(token, clientInfo(req)));
      } catch (err) {
        if ((err as { code?: string }).code === 'SESSION_REVOKED') clearAuthCookies(res);
        throw err;
      }
    },

    logout: async (req: Request, res: Response) => {
      const token = refreshTokenFrom(req);
      if (token) await auth.logoutByRefresh(token, clientInfo(req));
      else if (req.auth) await auth.logoutSession(req.auth.userId, req.auth.sessionId, clientInfo(req));
      clearAuthCookies(res);
      res.status(204).end();
    },

    logoutAll: async (req: Request, res: Response) => {
      await auth.logoutAll(userId(req), clientInfo(req));
      clearAuthCookies(res);
      res.status(204).end();
    },

    verifyEmail: async (req: Request, res: Response) => {
      await auth.verifyEmail(req.body.token);
      res.json({ verified: true });
    },
    resendVerification: async (req: Request, res: Response) => {
      await auth.resendVerification(req.body.email);
      res.status(202).json({ message: 'If that account needs verification, we sent a new link.' });
    },
    forgotPassword: async (req: Request, res: Response) => {
      await auth.forgotPassword(req.body.email);
      res.status(202).json({ message: 'If an account exists for that email, we sent a reset link.' });
    },
    resetPassword: async (req: Request, res: Response) => {
      await auth.resetPassword(req.body.token, req.body.password, clientInfo(req));
      clearAuthCookies(res);
      res.json({ reset: true });
    },
    changePassword: async (req: Request, res: Response) => {
      await auth.changePassword(userId(req), req.auth!.sessionId, req.body, clientInfo(req));
      res.json({ changed: true });
    },
    usernameAvailability: async (req: Request, res: Response) => {
      res.json(await checkUsername(res.locals.query.username, req.auth?.userId));
    },

    sessions: async (req: Request, res: Response) => {
      const sessions = await auth.listSessions(userId(req));
      res.json({ items: sessions.map((s) => toSessionDto(s, req.auth!.sessionId)) });
    },
    revokeSession: async (req: Request, res: Response) => {
      await auth.revokeSession(userId(req), String(req.params.id), clientInfo(req));
      res.status(204).end();
    },
    loginActivity: async (req: Request, res: Response) => {
      const { cursor, limit } = res.locals.query as { cursor?: string; limit: number };
      const events = await auth.loginActivity(userId(req), limit, cursorFilter(cursor));
      res.json(toPage(events, limit, toLoginActivityDto));
    },

    mfaSetup: async (req: Request, res: Response) => res.json(await auth.mfaSetup(userId(req))),
    mfaEnable: async (req: Request, res: Response) => res.json(await auth.mfaEnable(userId(req), req.body.code, clientInfo(req))),
    mfaDisable: async (req: Request, res: Response) => {
      await auth.mfaDisable(userId(req), req.body, clientInfo(req));
      res.json({ enabled: false });
    },
    mfaRecoveryCodes: async (req: Request, res: Response) =>
      res.json(await auth.regenerateRecoveryCodes(userId(req), req.body.code)),
  };
}

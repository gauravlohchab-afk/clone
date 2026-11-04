import { Redis } from 'ioredis';
import { OAuth2Client } from 'google-auth-library';
import { parseServerEnv, resolveBrand, type ServerEnv } from '@vyro/config';
import type { AppContext, GoogleVerifier } from './context.js';
import { createLogger, type Logger } from './lib/logger.js';
import { createConsoleMailer, createSmtpMailer } from './lib/mailer.js';
import { createJwt } from './lib/jwt.js';

export function googleVerifier(clientIds: string[]): GoogleVerifier | null {
  if (!clientIds.length) return null;
  const client = new OAuth2Client();
  return async (idToken) => {
    const ticket = await client.verifyIdToken({ idToken, audience: clientIds });
    const p = ticket.getPayload();
    if (!p?.sub || !p.email) throw new Error('Google token missing subject or email');
    return { sub: p.sub, email: p.email, emailVerified: !!p.email_verified, name: p.name, picture: p.picture };
  };
}

export function buildContext(env: ServerEnv = parseServerEnv(process.env), logger?: Logger): AppContext {
  const log = logger ?? createLogger(env.LOG_LEVEL, env.NODE_ENV === 'development');
  const mailer = env.SMTP_URL ? createSmtpMailer(env.SMTP_URL, env.MAIL_FROM) : createConsoleMailer(log);
  const redis = env.REDIS_URL ? new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: false }) : null;
  if (!redis && env.NODE_ENV === 'production') throw new Error('REDIS_URL is required in production');
  return {
    env,
    logger: log,
    mailer,
    redis,
    jwt: createJwt(env.JWT_ACCESS_SECRET, env.JWT_ISSUER, env.ACCESS_TOKEN_TTL_SECONDS),
    brandName: resolveBrand({ name: env.BRAND_NAME }).name,
    verifyGoogleIdToken: googleVerifier(env.googleClientIds),
  };
}

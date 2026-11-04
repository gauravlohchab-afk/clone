import { parseServerEnv } from '@vyro/config';
import type { AppContext, GoogleVerifier } from '../src/context.js';
import { createLogger } from '../src/lib/logger.js';
import { createMemoryMailer } from '../src/lib/mailer.js';
import { createJwt } from '../src/lib/jwt.js';

export function testContext(overrides: { google?: GoogleVerifier | null; mongoUri?: string } = {}) {
  const env = parseServerEnv({
    NODE_ENV: 'test',
    MONGODB_URI: overrides.mongoUri ?? 'mongodb://127.0.0.1:1/unused',
    JWT_ACCESS_SECRET: 'test-secret-'.padEnd(48, 'x'),
    MFA_ENCRYPTION_KEY: '0123456789abcdef'.repeat(4),
    APP_URL: 'http://app.test',
    LOG_LEVEL: 'silent',
  });
  const mailer = createMemoryMailer();
  const ctx: AppContext = {
    env,
    logger: createLogger('silent'),
    mailer,
    redis: null,
    jwt: createJwt(env.JWT_ACCESS_SECRET, env.JWT_ISSUER, env.ACCESS_TOKEN_TTL_SECONDS),
    brandName: 'VYRO',
    verifyGoogleIdToken: overrides.google === undefined ? null : overrides.google,
  };
  return { ctx, mailer };
}

import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

/**
 * Server environment schema. Secrets are read from the process environment only
 * (a local .env in development, the secret manager in deployed environments).
 * Optional integrations are allowed to be empty; the API reports them as
 * unconfigured instead of pretending they work.
 */
export const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    APP_URL: z.url().default('http://localhost:5173'),
    API_URL: z.url().default('http://localhost:4000'),
    CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),

    MONGODB_URI: z.string().min(1),
    REDIS_URL: z.string().optional().default(''),

    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_ISSUER: z.string().default('vyro-api'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    MFA_ENCRYPTION_KEY: z
      .string()
      .regex(/^[0-9a-f]{64}$/i, 'MFA_ENCRYPTION_KEY must be 32 bytes hex (64 chars)'),
    COOKIE_SECURE: bool.optional(),
    COOKIE_DOMAIN: z.string().optional().default(''),

    GOOGLE_CLIENT_IDS: z.string().optional().default(''),

    SMTP_URL: z.string().optional().default(''),
    MAIL_FROM: z.string().default('VYRO <no-reply@localhost>'),

    SENTRY_DSN: z.string().optional().default(''),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

    BRAND_NAME: z.string().optional().default(''),
  })
  .transform((env) => ({
    ...env,
    COOKIE_SECURE: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
    corsOrigins: env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
    googleClientIds: env.GOOGLE_CLIENT_IDS.split(',').map((s) => s.trim()).filter(Boolean),
  }));

export type ServerEnv = z.output<typeof serverEnvSchema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid server environment:\n${issues}`);
  }
  if (result.data.NODE_ENV === 'production') {
    if (!result.data.COOKIE_SECURE) throw new Error('COOKIE_SECURE must be true in production');
    if (!result.data.SMTP_URL) throw new Error('SMTP_URL is required in production');
  }
  return result.data;
}

import type { Redis } from 'ioredis';
import type { ServerEnv } from '@vyro/config';
import type { Logger } from './lib/logger.js';
import type { Mailer } from './lib/mailer.js';
import type { Jwt } from './lib/jwt.js';

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

export type GoogleVerifier = (idToken: string) => Promise<GoogleIdentity>;

/** Explicit dependencies, so tests can swap integrations without module mocking. */
export interface AppContext {
  env: ServerEnv;
  logger: Logger;
  mailer: Mailer;
  jwt: Jwt;
  redis: Redis | null;
  brandName: string;
  /** null when GOOGLE_CLIENT_IDS is not configured. */
  verifyGoogleIdToken: GoogleVerifier | null;
}

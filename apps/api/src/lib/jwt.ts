import { SignJWT, jwtVerify, errors } from 'jose';
import type { UserRole } from '@vyro/types';
import { unauthenticated } from './errors.js';

export interface AccessClaims {
  sub: string;
  sid: string;
  role: UserRole;
}

export function createJwt(secret: string, issuer: string, accessTtlSeconds: number) {
  const key = new TextEncoder().encode(secret);

  async function sign(payload: Record<string, unknown>, subject: string, ttl: number, audience: string) {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(subject)
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + ttl)
      .sign(key);
  }

  async function verify(token: string, audience: string) {
    try {
      const { payload } = await jwtVerify(token, key, { issuer, audience, algorithms: ['HS256'] });
      return payload;
    } catch (err) {
      if (err instanceof errors.JWTExpired) throw unauthenticated('Session expired', 'TOKEN_EXPIRED');
      throw unauthenticated('Invalid token');
    }
  }

  return {
    accessTtlSeconds,
    async signAccess(claims: AccessClaims) {
      const token = await sign({ sid: claims.sid, role: claims.role }, claims.sub, accessTtlSeconds, 'access');
      return { token, expiresAt: new Date(Date.now() + accessTtlSeconds * 1000) };
    },
    async verifyAccess(token: string): Promise<AccessClaims> {
      const p = await verify(token, 'access');
      if (typeof p.sub !== 'string' || typeof p.sid !== 'string' || typeof p.role !== 'string') {
        throw unauthenticated('Invalid token');
      }
      return { sub: p.sub, sid: p.sid, role: p.role as UserRole };
    },
    /** Short-lived token bridging the password step and the 2FA step of login. */
    signMfa: (userId: string) => sign({}, userId, 300, 'mfa'),
    async verifyMfa(token: string): Promise<string> {
      const p = await verify(token, 'mfa');
      if (typeof p.sub !== 'string') throw unauthenticated('Invalid token');
      return p.sub;
    },
  };
}
export type Jwt = ReturnType<typeof createJwt>;

import { authenticator } from 'otplib';
import { randomBytes } from 'node:crypto';
import { decryptSecret, encryptSecret, sha256 } from '../../lib/crypto.js';

authenticator.options = { window: 1, step: 30 };

export function newTotpSecret() {
  return authenticator.generateSecret(20);
}

export function otpauthUrl(accountLabel: string, issuer: string, secret: string) {
  return authenticator.keyuri(accountLabel, issuer, secret);
}

/**
 * Returns the matched time step, or null. Callers persist the step and reject
 * any code at or below it so a code cannot be replayed within its window.
 */
export function matchTotp(code: string, secretEnc: string, keyHex: string, lastUsedStep: number): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const secret = decryptSecret(secretEnc, keyHex);
  const delta = authenticator.checkDelta(code, secret);
  if (delta === null) return null;
  const step = Math.floor(Date.now() / 1000 / 30) + delta;
  return step > lastUsedStep ? step : null;
}

export function generateRecoveryCodes(count = 10): { plain: string[]; hashes: string[] } {
  const plain = Array.from({ length: count }, () => {
    const hex = randomBytes(5).toString('hex');
    return `${hex.slice(0, 5)}-${hex.slice(5)}`;
  });
  return { plain, hashes: plain.map((c) => sha256(c)) };
}

export const normaliseRecoveryCode = (code: string) => code.trim().toLowerCase();

export { encryptSecret };

import { describe, expect, it } from 'vitest';
import { authenticator } from 'otplib';
import { decryptSecret, encryptSecret, randomToken, safeEqual, sha256 } from '../../src/lib/crypto.js';
import { hashPassword, verifyPassword } from '../../src/lib/password.js';
import { createJwt } from '../../src/lib/jwt.js';
import { generateRecoveryCodes, matchTotp } from '../../src/modules/auth/mfa.js';

const key = 'ab'.repeat(32);

describe('crypto helpers', () => {
  it('generates unique url-safe tokens', () => {
    const a = randomToken();
    expect(a).toMatch(/^[\w-]{43}$/);
    expect(a).not.toBe(randomToken());
  });
  it('round-trips encrypted secrets and detects tampering', () => {
    const enc = encryptSecret('JBSWY3DPEHPK3PXP', key);
    expect(decryptSecret(enc, key)).toBe('JBSWY3DPEHPK3PXP');
    const [iv, tag, data] = enc.split('.');
    const tampered = [iv, tag, data!.slice(0, -2) + (data!.endsWith('A') ? 'BB' : 'AA')].join('.');
    expect(() => decryptSecret(tampered, key)).toThrow();
  });
  it('compares in constant time', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'ab')).toBe(false);
    expect(sha256('x')).toHaveLength(64);
  });
});

describe('password hashing', () => {
  it('uses argon2id and verifies', async () => {
    const hash = await hashPassword('correct horse 9');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword(hash, 'correct horse 9')).toBe(true);
    expect(await verifyPassword(hash, 'wrong horse 9')).toBe(false);
    expect(await verifyPassword('not-a-hash', 'x')).toBe(false);
  });
});

describe('jwt', () => {
  const jwt = createJwt('s'.repeat(40), 'vyro-test', 60);
  it('signs and verifies access tokens', async () => {
    const { token } = await jwt.signAccess({ sub: 'u1', sid: 's1', role: 'user' });
    await expect(jwt.verifyAccess(token)).resolves.toEqual({ sub: 'u1', sid: 's1', role: 'user' });
  });
  it('does not accept an MFA token as an access token, or vice versa', async () => {
    const mfa = await jwt.signMfa('u1');
    await expect(jwt.verifyAccess(mfa)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    const { token } = await jwt.signAccess({ sub: 'u1', sid: 's1', role: 'user' });
    await expect(jwt.verifyMfa(token)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });
  it('rejects tokens signed with another secret', async () => {
    const other = createJwt('o'.repeat(40), 'vyro-test', 60);
    const { token } = await other.signAccess({ sub: 'u1', sid: 's1', role: 'admin' });
    await expect(jwt.verifyAccess(token)).rejects.toMatchObject({ status: 401 });
  });
  it('reports expiry distinctly', async () => {
    const short = createJwt('s'.repeat(40), 'vyro-test', -10);
    const { token } = await short.signAccess({ sub: 'u1', sid: 's1', role: 'user' });
    await expect(jwt.verifyAccess(token)).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' });
  });
});

describe('totp', () => {
  it('accepts a current code once and rejects replay', () => {
    const secret = authenticator.generateSecret();
    const enc = encryptSecret(secret, key);
    const code = authenticator.generate(secret);
    const step = matchTotp(code, enc, key, 0);
    expect(step).toBeTypeOf('number');
    expect(matchTotp(code, enc, key, step!)).toBeNull();
    expect(matchTotp('000000', enc, key, 0) === null || code === '000000').toBe(true);
    expect(matchTotp('abc', enc, key, 0)).toBeNull();
  });
  it('generates distinct recovery codes with hashes', () => {
    const { plain, hashes } = generateRecoveryCodes();
    expect(plain).toHaveLength(10);
    expect(new Set(plain).size).toBe(10);
    expect(plain[0]).toMatch(/^[0-9a-f]{5}-[0-9a-f]{5}$/);
    expect(hashes[0]).toBe(sha256(plain[0]!));
  });
});

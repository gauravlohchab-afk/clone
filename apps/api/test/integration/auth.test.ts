import { describe, expect, it } from 'vitest';
import { authenticator } from 'otplib';
import { harness } from './harness.js';
import { User } from '../../src/modules/users/user.model.js';
import { Session } from '../../src/modules/auth/session.model.js';

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

describe('registration and email verification', () => {
  it('registers, emails a verification link, and verifies', async () => {
    const h = harness();
    const u = await h.register();
    expect(u.body.user).toMatchObject({ email: 'nova@example.com', emailVerified: false, username: null, hasPassword: true });
    const stored = await User.findOne({ email: 'nova@example.com' }).select('+passwordHash').lean();
    expect(stored!.passwordHash).toMatch(/^\$argon2id\$/);

    await h.verify();
    const me = await h.http().get('/api/v1/me').set(bearer(u.access));
    expect(me.body.emailVerified).toBe(true);
  });

  it('rejects duplicate emails case-insensitively', async () => {
    const h = harness();
    await h.register('nova@example.com');
    const res = await h.http().post('/api/v1/auth/register')
      .send({ email: 'NOVA@example.com', password: 'electric lime 42', dateOfBirth: '2000-01-15', acceptTerms: true });
    expect(res.status).toBe(409);
  });

  it('enforces the minimum age', async () => {
    const h = harness();
    const dob = new Date(Date.now() - 10 * 365 * 24 * 3600_000).toISOString().slice(0, 10);
    const res = await h.http().post('/api/v1/auth/register')
      .send({ email: 'kid@example.com', password: 'electric lime 42', dateOfBirth: dob, acceptTerms: true });
    expect(res.status).toBe(400);
  });

  it('verification links are single use', async () => {
    const h = harness();
    await h.register();
    const token = h.lastLink('verify-email');
    expect((await h.http().post('/api/v1/auth/verify-email').send({ token })).status).toBe(200);
    expect((await h.http().post('/api/v1/auth/verify-email').send({ token })).status).toBe(400);
  });
});

describe('login', () => {
  it('logs in by email or username and rejects bad passwords', async () => {
    const h = harness();
    await h.onboardedUser();
    const byEmail = await h.http().post('/api/v1/auth/login').send({ identifier: 'nova@example.com', password: 'electric lime 42', platform: 'android' });
    expect(byEmail.status).toBe(200);
    expect(byEmail.body.status).toBe('authenticated');
    const byUsername = await h.http().post('/api/v1/auth/login').send({ identifier: 'NOVA', password: 'electric lime 42', platform: 'android' });
    expect(byUsername.status).toBe(200);
    const wrong = await h.http().post('/api/v1/auth/login').send({ identifier: 'nova', password: 'nope nope 1' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
    const unknown = await h.http().post('/api/v1/auth/login').send({ identifier: 'ghost@example.com', password: 'nope nope 1' });
    expect(unknown.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('locks the account after repeated failures', async () => {
    const h = harness();
    await h.register();
    // Use distinct IP-free identifiers? Lockout is per account, so vary nothing but stay under the rate limit.
    for (let i = 0; i < 5; i++) {
      await h.http().post('/api/v1/auth/login').send({ identifier: 'nova@example.com', password: `wrong pass ${i}` });
    }
    const locked = await h.http().post('/api/v1/auth/login').send({ identifier: 'nova@example.com', password: 'electric lime 42' });
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('web login sets httpOnly refresh cookie and CSRF cookie, never returns the refresh token', async () => {
    const h = harness();
    await h.register();
    const res = await h.http().post('/api/v1/auth/login').send({ identifier: 'nova@example.com', password: 'electric lime 42', platform: 'web' });
    expect(res.status).toBe(200);
    expect(res.body.refreshToken).toBeUndefined();
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const rt = cookies.find((c) => c.startsWith('vyro_rt='))!;
    expect(rt).toMatch(/HttpOnly/i);
    expect(rt).toMatch(/SameSite=Strict/i);
    expect(rt).toMatch(/Path=\/api\/v1\/auth/);
    expect(cookies.some((c) => c.startsWith('vyro_csrf='))).toBe(true);
  });
});

describe('refresh token rotation', () => {
  it('rotates on every refresh and revokes the session when an old token is replayed', async () => {
    const h = harness();
    const u = await h.register();
    const first = await h.http().post('/api/v1/auth/refresh').send({ refreshToken: u.refresh, platform: 'ios' });
    expect(first.status).toBe(200);
    expect(first.body.refreshToken).not.toBe(u.refresh);

    // Move the retirement time outside the race grace window, then replay.
    await Session.updateMany({}, { $set: { 'retired.$[].at': new Date(Date.now() - 60_000) } });
    const replay = await h.http().post('/api/v1/auth/refresh').send({ refreshToken: u.refresh });
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('SESSION_REVOKED');

    // The legitimate newest token is now dead too, and so is its access token.
    const after = await h.http().post('/api/v1/auth/refresh').send({ refreshToken: first.body.refreshToken });
    expect(after.status).toBe(401);
    expect((await h.http().get('/api/v1/me').set(bearer(first.body.accessToken))).status).toBe(401);
  });

  it('web refresh works with cookie + CSRF header', async () => {
    const h = harness();
    await h.register();
    const agent = (await import('supertest')).default.agent(h.app);
    await agent.post('/api/v1/auth/login').send({ identifier: 'nova@example.com', password: 'electric lime 42', platform: 'web' });
    const csrf = (agent as unknown as { jar: { getCookie(n: string, o: object): { value: string } | undefined } }).jar
      .getCookie('vyro_csrf', { domain: '127.0.0.1', path: '/', secure: false, script: false })?.value;
    expect(csrf).toBeTruthy();
    const res = await agent.post('/api/v1/auth/refresh').set('X-CSRF-Token', csrf!).send({});
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });
});

describe('logout and sessions', () => {
  it('logout revokes the session immediately', async () => {
    const h = harness();
    const u = await h.register();
    expect((await h.http().post('/api/v1/auth/logout').set(bearer(u.access)).send({ refreshToken: u.refresh })).status).toBe(204);
    expect((await h.http().get('/api/v1/me').set(bearer(u.access))).status).toBe(401);
    expect((await h.http().post('/api/v1/auth/refresh').send({ refreshToken: u.refresh })).status).toBe(401);
  });

  it('lists sessions and revokes another device', async () => {
    const h = harness();
    const a = await h.register();
    const b = await h.http().post('/api/v1/auth/login').send({ identifier: 'nova@example.com', password: 'electric lime 42', platform: 'android', deviceName: 'Pixel' });
    const list = await h.http().get('/api/v1/auth/sessions').set(bearer(a.access));
    expect(list.body.items).toHaveLength(2);
    const other = list.body.items.find((s: { current: boolean }) => !s.current);
    expect(other.deviceName).toBe('Pixel');
    expect((await h.http().delete(`/api/v1/auth/sessions/${other.id}`).set(bearer(a.access))).status).toBe(204);
    expect((await h.http().get('/api/v1/me').set(bearer(b.body.accessToken))).status).toBe(401);
  });

  it('cannot revoke another user\'s session', async () => {
    const h = harness();
    const a = await h.register('a@example.com');
    const b = await h.register('b@example.com');
    const bSessions = await h.http().get('/api/v1/auth/sessions').set(bearer(b.access));
    const res = await h.http().delete(`/api/v1/auth/sessions/${bSessions.body.items[0].id}`).set(bearer(a.access));
    expect(res.status).toBe(404);
    expect((await h.http().get('/api/v1/me').set(bearer(b.access))).status).toBe(200);
  });

  it('records login activity', async () => {
    const h = harness();
    const u = await h.register();
    await h.http().post('/api/v1/auth/login').send({ identifier: 'nova@example.com', password: 'bad password 1' });
    const res = await h.http().get('/api/v1/auth/login-activity?limit=10').set(bearer(u.access));
    expect(res.body.items.map((e: { type: string }) => e.type)).toEqual(['login_failed', 'login']);
  });
});

describe('password reset and change', () => {
  it('resets the password via emailed link and signs out everywhere', async () => {
    const h = harness();
    const u = await h.register();
    const forgot = await h.http().post('/api/v1/auth/forgot-password').send({ email: 'nova@example.com' });
    expect(forgot.status).toBe(202);
    const token = h.lastLink('reset-password');
    expect((await h.http().post('/api/v1/auth/reset-password').send({ token, password: 'violet coral 77' })).status).toBe(200);
    expect((await h.http().get('/api/v1/me').set(bearer(u.access))).status).toBe(401);
    expect((await h.http().post('/api/v1/auth/login').send({ identifier: 'nova@example.com', password: 'electric lime 42' })).status).toBe(401);
    expect((await h.http().post('/api/v1/auth/login').send({ identifier: 'nova@example.com', password: 'violet coral 77' })).status).toBe(200);
    expect((await h.http().post('/api/v1/auth/reset-password').send({ token, password: 'another pass 1' })).status).toBe(400);
  });

  it('forgot-password does not reveal whether an account exists', async () => {
    const h = harness();
    const res = await h.http().post('/api/v1/auth/forgot-password').send({ email: 'ghost@example.com' });
    expect(res.status).toBe(202);
    expect(h.mailer.outbox).toHaveLength(0);
  });

  it('change password requires the current password and keeps this session', async () => {
    const h = harness();
    const u = await h.register();
    const bad = await h.http().post('/api/v1/auth/password').set(bearer(u.access)).send({ currentPassword: 'nope nope 1', newPassword: 'violet coral 77' });
    expect(bad.status).toBe(401);
    const ok = await h.http().post('/api/v1/auth/password').set(bearer(u.access)).send({ currentPassword: u.password, newPassword: 'violet coral 77' });
    expect(ok.status).toBe(200);
    expect((await h.http().get('/api/v1/me').set(bearer(u.access))).status).toBe(200);
  });
});

describe('two-factor authentication', () => {
  it('enables TOTP, requires it at login, accepts recovery codes once, and disables', async () => {
    const h = harness();
    const u = await h.register();
    const setup = await h.http().post('/api/v1/auth/mfa/setup').set(bearer(u.access));
    expect(setup.body.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    const secret = setup.body.secret as string;

    const enable = await h.http().post('/api/v1/auth/mfa/enable').set(bearer(u.access)).send({ code: authenticator.generate(secret) });
    expect(enable.status).toBe(200);
    const recovery = enable.body.recoveryCodes as string[];
    expect(recovery).toHaveLength(10);

    const login = await h.http().post('/api/v1/auth/login').send({ identifier: 'nova@example.com', password: u.password });
    expect(login.body.status).toBe('mfa_required');
    expect(login.body.accessToken).toBeUndefined();

    const wrong = await h.http().post('/api/v1/auth/login/mfa').send({ mfaToken: login.body.mfaToken, code: '000000' === authenticator.generate(secret) ? '111111' : '000000' });
    expect(wrong.body.error.code).toBe('MFA_INVALID');

    const viaRecovery = await h.http().post('/api/v1/auth/login/mfa').send({ mfaToken: login.body.mfaToken, code: recovery[0] });
    expect(viaRecovery.body.status).toBe('authenticated');
    const reused = await h.http().post('/api/v1/auth/login/mfa').send({ mfaToken: login.body.mfaToken, code: recovery[0] });
    expect(reused.status).toBe(401);

    const disable = await h.http().post('/api/v1/auth/mfa/disable').set(bearer(u.access)).send({ code: recovery[1], password: u.password });
    expect(disable.status).toBe(200);
    const plain = await h.http().post('/api/v1/auth/login').send({ identifier: 'nova@example.com', password: u.password });
    expect(plain.body.status).toBe('authenticated');
  });
});

describe('Google sign-in', () => {
  const google = async (token: string) => {
    const [sub, email] = token.split('|');
    return { sub: sub!, email: email!, emailVerified: true };
  };

  it('creates an account, needs a date of birth for new users, and signs in again by subject', async () => {
    const h = harness({ google });
    const noDob = await h.http().post('/api/v1/auth/google').send({ idToken: 'g-123|g@example.com', platform: 'ios' });
    expect(noDob.status).toBe(400);
    const created = await h.http().post('/api/v1/auth/google').send({ idToken: 'g-123|g@example.com', dateOfBirth: '1999-03-03', platform: 'ios' });
    expect(created.status).toBe(200);
    expect(created.body.user).toMatchObject({ emailVerified: true, googleLinked: true, hasPassword: false });
    const again = await h.http().post('/api/v1/auth/google').send({ idToken: 'g-123|g@example.com', platform: 'ios' });
    expect(again.body.user.id).toBe(created.body.user.id);
  });

  it('strips an unverified password when linking (pre-hijack defence)', async () => {
    const h = harness({ google });
    const attacker = await h.register('victim@example.com', 'attacker pass 1');
    const res = await h.http().post('/api/v1/auth/google').send({ idToken: 'g-9|victim@example.com', platform: 'ios' });
    expect(res.body.user.hasPassword).toBe(false);
    expect((await h.http().get('/api/v1/me').set(bearer(attacker.access))).status).toBe(401);
    const login = await h.http().post('/api/v1/auth/login').send({ identifier: 'victim@example.com', password: 'attacker pass 1' });
    expect(login.status).toBe(401);
  });
});

describe('suspension', () => {
  it('blocks a suspended account immediately', async () => {
    const h = harness();
    const u = await h.register();
    await User.updateOne({ email: 'nova@example.com' }, { status: 'suspended' });
    const me = await h.http().get('/api/v1/me').set(bearer(u.access));
    expect(me.status).toBe(403);
    expect(me.body.error.code).toBe('ACCOUNT_SUSPENDED');
    expect((await h.http().post('/api/v1/auth/refresh').send({ refreshToken: u.refresh })).status).toBe(403);
  });
});

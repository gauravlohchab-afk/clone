import request from 'supertest';
import { expect } from 'vitest';
import { createApp } from '../../src/app.js';
import type { GoogleVerifier } from '../../src/context.js';
import { testContext } from '../helpers.js';

export function harness(opts: { google?: GoogleVerifier } = {}) {
  const { ctx, mailer } = testContext({ google: opts.google ?? null });
  const app = createApp(ctx);
  const http = () => request(app);

  function lastLink(kind: 'verify-email' | 'reset-password') {
    const mail = [...mailer.outbox].reverse().find((m) => m.text.includes(`/${kind}?token=`));
    expect(mail, `expected a ${kind} email`).toBeTruthy();
    return new URL(mail!.text.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;
  }

  /** Registers via the native flow (refresh token in body) and returns tokens. */
  async function register(email = 'nova@example.com', password = 'electric lime 42') {
    const res = await http()
      .post('/api/v1/auth/register')
      .send({ email, password, dateOfBirth: '2000-01-15', acceptTerms: true, platform: 'ios', deviceName: 'Test iPhone' });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return { access: res.body.accessToken as string, refresh: res.body.refreshToken as string, body: res.body, email, password };
  }

  async function verify() {
    const res = await http().post('/api/v1/auth/verify-email').send({ token: lastLink('verify-email') });
    expect(res.status).toBe(200);
  }

  /** Registered, verified user with a username. */
  async function onboardedUser(email = 'nova@example.com', username = 'nova') {
    const u = await register(email);
    await verify();
    const res = await http().put('/api/v1/me/username').set('Authorization', `Bearer ${u.access}`).send({ username });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    return u;
  }

  return { ctx, mailer, app, http, lastLink, register, verify, onboardedUser };
}

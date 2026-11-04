import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { testContext } from '../helpers.js';

/**
 * HTTP behaviour that is decided before any database access: validation,
 * authentication, CSRF, rate limiting, security headers, error envelope.
 */
describe('HTTP layer (no database)', () => {
  const { ctx } = testContext();
  const app = createApp(ctx);

  it('serves health and sets security headers', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('returns a JSON 404 envelope', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('validates registration input with field details', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'bad', password: 'short', acceptTerms: false });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['email', 'password', 'dateOfBirth', 'acceptTerms']));
  });

  it('rejects malformed JSON', async () => {
    const res = await request(app).post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{"identifier":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('requires a bearer token on protected routes', async () => {
    expect((await request(app).get('/api/v1/me')).body.error.code).toBe('UNAUTHENTICATED');
    const bad = await request(app).get('/api/v1/me').set('Authorization', 'Bearer not.a.jwt');
    expect(bad.status).toBe(401);
  });

  it('rejects an MFA token used as an access token', async () => {
    const mfa = await ctx.jwt.signMfa('507f1f77bcf86cd799439011');
    const res = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${mfa}`);
    expect(res.status).toBe(401);
  });

  it('requires CSRF header when refreshing with the cookie', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', ['vyro_rt=abc', 'vyro_csrf=t1']).send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_FAILED');
    const mismatch = await request(app)
      .post('/api/v1/auth/refresh').set('Cookie', ['vyro_rt=abc', 'vyro_csrf=t1']).set('X-CSRF-Token', 't2').send({});
    expect(mismatch.body.error.code).toBe('CSRF_FAILED');
  });

  it('refresh without any token is unauthenticated', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({});
    expect(res.status).toBe(401);
  });

  it('reports Google sign-in as not configured instead of faking it', async () => {
    const res = await request(app).post('/api/v1/auth/google').send({ idToken: 'x'.repeat(20) });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('NOT_CONFIGURED');
  });

  it('rate limits credential attempts per IP and identifier', async () => {
    const fresh = createApp(testContext().ctx);
    let last = 0;
    for (let i = 0; i < 11; i++) {
      last = (await request(fresh).post('/api/v1/auth/login').send({ identifier: 'victim@example.com' })).status;
    }
    expect(last).toBe(429);
  });

  it('blocks disallowed CORS origins and allows configured ones', async () => {
    const ok = await request(app).options('/api/v1/auth/login').set('Origin', 'http://localhost:5173').set('Access-Control-Request-Method', 'POST');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const evil = await request(app).options('/api/v1/auth/login').set('Origin', 'https://evil.test').set('Access-Control-Request-Method', 'POST');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });
});

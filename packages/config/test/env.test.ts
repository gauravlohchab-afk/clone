import { describe, expect, it } from 'vitest';
import { parseServerEnv, resolveBrand } from '../src/index.js';

const base = {
  MONGODB_URI: 'mongodb://localhost/vyro',
  JWT_ACCESS_SECRET: 'x'.repeat(40),
  MFA_ENCRYPTION_KEY: 'a'.repeat(64),
};

describe('parseServerEnv', () => {
  it('applies defaults and derives lists', () => {
    const env = parseServerEnv({ ...base, CORS_ORIGINS: 'http://a.test, http://b.test' });
    expect(env.PORT).toBe(4000);
    expect(env.corsOrigins).toEqual(['http://a.test', 'http://b.test']);
    expect(env.COOKIE_SECURE).toBe(false);
  });
  it('rejects a short JWT secret', () => {
    expect(() => parseServerEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
  });
  it('refuses production without secure cookies or SMTP', () => {
    expect(() => parseServerEnv({ ...base, NODE_ENV: 'production', COOKIE_SECURE: 'false' })).toThrow();
    expect(() => parseServerEnv({ ...base, NODE_ENV: 'production' })).toThrow(/SMTP_URL/);
  });
});

describe('resolveBrand', () => {
  it('keeps defaults for empty overrides', () => {
    expect(resolveBrand({ name: '' }).name).toBe('VYRO');
    expect(resolveBrand({ name: 'Nova' }).name).toBe('Nova');
  });
});

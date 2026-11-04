import { describe, expect, it } from 'vitest';
import { registerSchema, updateProfileSchema, username, interestsSchema, password } from '../src/index.js';

describe('username', () => {
  it.each(['ab', 'a'.repeat(31), 'has space', 'UPPER!', '.dot', 'dot.', 'a..b', '12345', 'admin'])(
    'rejects %s',
    (u) => expect(username.safeParse(u).success).toBe(false),
  );
  it.each(['nova', 'nova.lime', 'nova_99', 'a1b'])('accepts %s', (u) =>
    expect(username.safeParse(u).success).toBe(true),
  );
  it('lowercases', () => expect(username.parse('NovaLime')).toBe('novalime'));
});

describe('password', () => {
  it('requires length and a letter and digit', () => {
    expect(password.safeParse('short1').success).toBe(false);
    expect(password.safeParse('onlyletterslong').success).toBe(false);
    expect(password.safeParse('letters and 123').success).toBe(true);
  });
});

describe('registerSchema', () => {
  const ok = { email: ' User@Example.COM ', password: 'correct horse 9', dateOfBirth: '2000-02-01', acceptTerms: true };
  it('normalises email and defaults platform', () => {
    const r = registerSchema.parse(ok);
    expect(r.email).toBe('user@example.com');
    expect(r.platform).toBe('web');
  });
  it('requires terms acceptance', () => {
    expect(registerSchema.safeParse({ ...ok, acceptTerms: false }).success).toBe(false);
  });
});

describe('updateProfileSchema', () => {
  it('normalises website and strips control chars', () => {
    const r = updateProfileSchema.parse({ website: 'vyro.example', bio: ' hi\u0007 ' });
    expect(r.website).toBe('https://vyro.example');
    expect(r.bio).toBe('hi');
  });
  it('rejects javascript urls and empty updates', () => {
    expect(updateProfileSchema.safeParse({ website: 'javascript:alert(1)' }).success).toBe(false);
    expect(updateProfileSchema.safeParse({}).success).toBe(false);
  });
  it('enforces bio length', () => {
    expect(updateProfileSchema.safeParse({ bio: 'x'.repeat(161) }).success).toBe(false);
  });
});

describe('interestsSchema', () => {
  it('dedupes and rejects unknown interests', () => {
    expect(interestsSchema.parse({ interests: ['art', 'art', 'music'] }).interests).toEqual(['art', 'music']);
    expect(interestsSchema.safeParse({ interests: ['not-real'] }).success).toBe(false);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { ageOn, createApiClient, formatCount, ApiError } from '../src/index.js';

describe('ageOn', () => {
  it('handles birthdays', () => {
    expect(ageOn('2000-06-15', new Date('2026-06-14T00:00:00Z'))).toBe(25);
    expect(ageOn('2000-06-15', new Date('2026-06-15T00:00:00Z'))).toBe(26);
  });
});

describe('formatCount', () => {
  it('compacts', () => expect(formatCount(1234)).toBe('1.2K'));
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('createApiClient', () => {
  it('refreshes once on TOKEN_EXPIRED and retries', async () => {
    let token: string | null = 'old';
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json(401, { error: { code: 'TOKEN_EXPIRED', message: 'expired' } }))
      .mockResolvedValueOnce(json(200, { status: 'authenticated', accessToken: 'new', refreshToken: 'r2', user: {} }))
      .mockResolvedValueOnce(json(200, { ok: true }));
    const setRefresh = vi.fn(async () => {});
    const api = createApiClient({
      baseUrl: 'http://api.test',
      platform: 'ios',
      fetchImpl,
      tokens: {
        getAccessToken: () => token,
        setAccessToken: (t) => (token = t),
        getRefreshToken: async () => 'r1',
        setRefreshToken: setRefresh,
      },
    });
    await expect(api.get('/api/v1/me')).resolves.toEqual({ ok: true });
    expect(token).toBe('new');
    expect(setRefresh).toHaveBeenCalledWith('r2');
    const retried = fetchImpl.mock.calls[2]![1] as RequestInit;
    expect((retried.headers as Record<string, string>).Authorization).toBe('Bearer new');
  });

  it('throws ApiError with code and reports expiry when refresh fails', async () => {
    const onSessionExpired = vi.fn();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHENTICATED', message: 'no' } }))
      .mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHENTICATED', message: 'no' } }));
    const api = createApiClient({
      baseUrl: '', platform: 'web', fetchImpl, onSessionExpired,
      tokens: { getAccessToken: () => 't', setAccessToken: () => {} },
    });
    const err = await api.get('/api/v1/me').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('UNAUTHENTICATED');
    expect(onSessionExpired).toHaveBeenCalled();
  });
});

import { mergeSettings } from '../src/index.js';
describe('mergeSettings', () => {
  it('merges nested privacy and notification patches without dropping keys', () => {
    const base = {
      theme: 'system', language: 'en', timezone: 'UTC', country: '',
      privacy: { showActivityStatus: true, allowMentionsFrom: 'everyone', allowMessagesFrom: 'everyone', allowCommentsFrom: 'everyone', hiddenWords: [] },
      notifications: { likes: true, comments: true, follows: true, mentions: true, messages: true, email: true, push: true },
    } as const;
    const next = mergeSettings(structuredClone(base) as never, { theme: 'dark', privacy: { allowMessagesFrom: 'nobody' }, notifications: { likes: false } });
    expect(next.theme).toBe('dark');
    expect(next.privacy).toMatchObject({ allowMessagesFrom: 'nobody', allowMentionsFrom: 'everyone' });
    expect(next.notifications).toMatchObject({ likes: false, comments: true });
  });
});

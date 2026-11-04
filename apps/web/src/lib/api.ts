import { createApiClient } from '@vyro/shared';

/** Access token lives in memory only; the refresh token is an httpOnly cookie. */
let accessToken: string | null = null;
let onExpired: (() => void) | null = null;

export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL ?? '',
  platform: 'web',
  tokens: {
    getAccessToken: () => accessToken,
    setAccessToken: (t) => (accessToken = t),
  },
  onSessionExpired: () => onExpired?.(),
});

export const setAccessToken = (t: string | null) => (accessToken = t);
export const onSessionExpired = (fn: () => void) => (onExpired = fn);

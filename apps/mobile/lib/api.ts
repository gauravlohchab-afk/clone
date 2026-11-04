import { Platform } from 'react-native';
import { createApiClient } from '@vyro/shared';
import { secureRefreshStore } from './secure-tokens';

let accessToken: string | null = null;
let onExpired: (() => void) | null = null;

export const platform: 'ios' | 'android' = Platform.OS === 'android' ? 'android' : 'ios';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

export const api = createApiClient({
  baseUrl: API_URL,
  platform,
  tokens: {
    getAccessToken: () => accessToken,
    setAccessToken: (t) => (accessToken = t),
    getRefreshToken: secureRefreshStore.get,
    setRefreshToken: secureRefreshStore.set,
  },
  onSessionExpired: () => onExpired?.(),
});

export const setAccessToken = (t: string | null) => (accessToken = t);
export const onSessionExpired = (fn: () => void) => (onExpired = fn);

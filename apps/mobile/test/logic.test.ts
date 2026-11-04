import { formatDob } from '../lib/format';

const store: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  getItemAsync: jest.fn(async (k: string) => store[k] ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => { store[k] = v; }),
  deleteItemAsync: jest.fn(async (k: string) => { delete store[k]; }),
}));

const me = { id: 'u1', email: 'a@b.co', emailVerified: true, username: 'nova', role: 'user', status: 'active', mfaEnabled: false, hasPassword: true, googleLinked: false, onboardingCompleted: true, createdAt: '', profile: null } as const;

describe('formatDob', () => {
  it('inserts dashes as digits are typed and caps length', () => {
    expect(formatDob('2000')).toBe('2000');
    expect(formatDob('200001')).toBe('2000-01');
    expect(formatDob('20000115999')).toBe('2000-01-15');
    expect(formatDob('2000-01-1')).toBe('2000-01-1');
  });
});

describe('auth store', () => {
  beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

  it('routes users the same way as web', () => {
    const { homeRouteFor } = require('../stores/auth');
    expect(homeRouteFor(me)).toBe('/profile');
    expect(homeRouteFor({ ...me, onboardingCompleted: false })).toBe('/onboarding');
    expect(homeRouteFor({ ...me, status: 'pending_deletion' })).toBe('/settings/account');
  });

  it('keeps the refresh token in secure storage and clears it on sign-out', async () => {
    const { useAuth } = require('../stores/auth');
    await useAuth.getState().acceptAuth({ status: 'authenticated', accessToken: 'a', accessTokenExpiresAt: '', refreshToken: 'r1', user: me });
    expect(store['vyro.refresh']).toBe('r1');
    expect(useAuth.getState().status).toBe('signed_in');
    await useAuth.getState().clear();
    expect(store['vyro.refresh']).toBeUndefined();
    expect(useAuth.getState().status).toBe('signed_out');
  });

  it('bootstrap without a stored token signs out without calling the API', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const { useAuth } = require('../stores/auth');
    await useAuth.getState().bootstrap();
    expect(useAuth.getState().status).toBe('signed_out');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

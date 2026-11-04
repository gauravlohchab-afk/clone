import { create } from 'zustand';
import type { AuthSuccess, MeDto } from '@vyro/types';
import { api, onSessionExpired, setAccessToken } from '../lib/api';
import { secureRefreshStore } from '../lib/secure-tokens';

type Status = 'loading' | 'signed_out' | 'signed_in';

interface AuthState {
  status: Status;
  user: MeDto | null;
  bootstrap: () => Promise<void>;
  acceptAuth: (result: AuthSuccess) => Promise<void>;
  setUser: (user: MeDto) => void;
  reloadMe: () => Promise<MeDto | null>;
  signOut: () => Promise<void>;
  clear: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,
  async bootstrap() {
    const stored = await secureRefreshStore.get().catch(() => null);
    if (!stored || !(await api.refresh())) return set({ status: 'signed_out', user: null });
    await get().reloadMe();
  },
  async acceptAuth(result) {
    setAccessToken(result.accessToken);
    if (result.refreshToken) await secureRefreshStore.set(result.refreshToken);
    set({ status: 'signed_in', user: result.user });
  },
  setUser: (user) => set({ user }),
  async reloadMe() {
    try {
      const user = await api.get<MeDto>('/api/v1/me');
      set({ status: 'signed_in', user });
      return user;
    } catch {
      await get().clear();
      return null;
    }
  },
  async signOut() {
    const refreshToken = await secureRefreshStore.get().catch(() => null);
    await api.post('/api/v1/auth/logout', refreshToken ? { refreshToken } : {}).catch(() => undefined);
    await get().clear();
  },
  async clear() {
    setAccessToken(null);
    await secureRefreshStore.set(null).catch(() => undefined);
    set({ status: 'signed_out', user: null });
  },
}));

onSessionExpired(() => void useAuth.getState().clear());

/** Mirrors the web routing rules so both clients land users in the same place. */
export function homeRouteFor(user: MeDto): '/settings/account' | '/onboarding' | '/profile' {
  if (user.status === 'pending_deletion') return '/settings/account';
  if (!user.onboardingCompleted || !user.username) return '/onboarding';
  return '/profile';
}

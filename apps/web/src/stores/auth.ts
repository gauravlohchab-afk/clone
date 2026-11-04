import { create } from 'zustand';
import type { AuthSuccess, MeDto } from '@vyro/types';
import { api, onSessionExpired, setAccessToken } from '../lib/api';

type Status = 'loading' | 'signed_out' | 'signed_in';

interface AuthState {
  status: Status;
  user: MeDto | null;
  bootstrap: () => Promise<void>;
  acceptAuth: (result: AuthSuccess) => void;
  setUser: (user: MeDto) => void;
  reloadMe: () => Promise<MeDto | null>;
  signOut: () => Promise<void>;
  clear: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,
  async bootstrap() {
    // Restore the session from the refresh cookie, if any.
    const ok = await api.refresh();
    if (!ok) return set({ status: 'signed_out', user: null });
    await get().reloadMe();
  },
  acceptAuth(result) {
    setAccessToken(result.accessToken);
    set({ status: 'signed_in', user: result.user });
  },
  setUser: (user) => set({ user }),
  async reloadMe() {
    try {
      const user = await api.get<MeDto>('/api/v1/me');
      set({ status: 'signed_in', user });
      return user;
    } catch {
      set({ status: 'signed_out', user: null });
      return null;
    }
  },
  async signOut() {
    await api.post('/api/v1/auth/logout').catch(() => undefined);
    get().clear();
  },
  clear() {
    setAccessToken(null);
    set({ status: 'signed_out', user: null });
  },
}));

onSessionExpired(() => useAuth.getState().clear());

/** Where a signed-in user should land, given how far onboarding has got. */
export function homePathFor(user: MeDto): string {
  if (user.status === 'pending_deletion') return '/settings/account';
  if (!user.onboardingCompleted || !user.username) return '/onboarding';
  return `/${user.username}`;
}

import { useCallback, useEffect, useState } from 'react';
import type { SettingsDto } from '@vyro/types';
import { api } from './api';
import { errorMessage } from './form-errors';

type Patch = { [K in keyof SettingsDto]?: SettingsDto[K] extends object ? Partial<SettingsDto[K]> : SettingsDto[K] };

/** Loads settings and applies optimistic patches, rolling back on failure. */
export function useSettings() {
  const [settings, setSettings] = useState<SettingsDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<SettingsDto>('/api/v1/me/settings').then(setSettings).catch((e) => setError(errorMessage(e)));
  }, []);

  const update = useCallback(async (patch: Patch) => {
    const before = settings;
    if (before) {
      setSettings({
        ...before,
        ...patch,
        privacy: { ...before.privacy, ...patch.privacy },
        notifications: { ...before.notifications, ...patch.notifications },
      } as SettingsDto);
    }
    setError(null);
    try {
      setSettings(await api.patch<SettingsDto>('/api/v1/me/settings', patch));
      return true;
    } catch (e) {
      setSettings(before);
      setError(errorMessage(e));
      return false;
    }
  }, [settings]);

  return { settings, error, update };
}

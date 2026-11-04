import { useCallback, useEffect, useState } from 'react';
import type { SettingsDto } from '@vyro/types';
import { mergeSettings, type SettingsPatch } from '@vyro/shared';
import { api } from './api';
import { errorMessage } from './form-errors';

/** Loads settings and applies optimistic patches, rolling back on failure. */
export function useSettings() {
  const [settings, setSettings] = useState<SettingsDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<SettingsDto>('/api/v1/me/settings').then(setSettings).catch((e) => setError(errorMessage(e)));
  }, []);

  const update = useCallback(async (patch: SettingsPatch) => {
    const before = settings;
    if (before) setSettings(mergeSettings(before, patch));
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

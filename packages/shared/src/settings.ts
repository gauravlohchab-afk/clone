import type { SettingsDto } from '@vyro/types';

export type SettingsPatch = {
  [K in keyof SettingsDto]?: SettingsDto[K] extends unknown[] ? SettingsDto[K] : SettingsDto[K] extends object ? Partial<SettingsDto[K]> : SettingsDto[K];
};

/** Optimistic local merge of a settings patch, matching the API's nested-merge semantics. */
export function mergeSettings(current: SettingsDto, patch: SettingsPatch): SettingsDto {
  return {
    ...current,
    ...patch,
    privacy: { ...current.privacy, ...patch.privacy },
    notifications: { ...current.notifications, ...patch.notifications },
  } as SettingsDto;
}

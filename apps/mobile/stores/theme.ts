import { create } from 'zustand';
import { useColorScheme } from 'react-native';
import { themes, type ThemeName } from '@vyro/ui';

type Pref = 'system' | 'light' | 'dark';
export const useThemePref = create<{ pref: Pref; setPref: (p: Pref) => void }>((set) => ({
  pref: 'system',
  setPref: (pref) => set({ pref }),
}));

export function useTheme() {
  const system = useColorScheme();
  const pref = useThemePref((s) => s.pref);
  const name: ThemeName = pref === 'system' ? (system === 'light' ? 'light' : 'dark') : pref;
  return { name, c: themes[name] };
}
export type ThemeColors = (typeof themes)[ThemeName];

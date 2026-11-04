import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useFonts, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { SettingsDto } from '@vyro/types';
import { useAuth } from '../stores/auth';
import { useTheme, useThemePref } from '../stores/theme';
import { api } from '../lib/api';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ SpaceGrotesk_700Bold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  const { status, bootstrap } = useAuth();
  const { name, c } = useTheme();
  const setPref = useThemePref((s) => s.setPref);

  useEffect(() => { void bootstrap(); }, [bootstrap]);
  useEffect(() => {
    if (fontsLoaded && status !== 'loading') void SplashScreen.hideAsync();
  }, [fontsLoaded, status]);
  useEffect(() => {
    if (status !== 'signed_in') return;
    api.get<SettingsDto>('/api/v1/me/settings').then((s) => setPref(s.theme)).catch(() => undefined);
  }, [status, setPref]);
  useEffect(() => { void SystemUI.setBackgroundColorAsync(c.bg); }, [c.bg]);

  if (!fontsLoaded || status === 'loading') return null;
  return (
    <SafeAreaProvider>
      <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
    </SafeAreaProvider>
  );
}

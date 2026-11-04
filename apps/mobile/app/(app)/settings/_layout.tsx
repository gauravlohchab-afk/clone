import { Stack } from 'expo-router';
import { useTheme } from '../../../stores/theme';
import { fonts } from '../../../components/fonts';

export default function SettingsLayout() {
  const { c } = useTheme();
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: c.bg },
      headerTintColor: c.text,
      headerTitleStyle: { fontFamily: fonts.semibold },
      headerShadowVisible: false,
      contentStyle: { backgroundColor: c.bg },
    }}>
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="profile" options={{ title: 'Edit profile' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
      <Stack.Screen name="hidden" options={{ title: 'Blocked and muted' }} />
      <Stack.Screen name="security" options={{ title: 'Password and security' }} />
      <Stack.Screen name="preferences" options={{ title: 'Preferences' }} />
      <Stack.Screen name="account" options={{ title: 'Your account' }} />
    </Stack>
  );
}

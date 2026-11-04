import { Redirect, Stack } from 'expo-router';
import { homeRouteFor, useAuth } from '../../stores/auth';
import { useTheme } from '../../stores/theme';

export default function AuthLayout() {
  const user = useAuth((s) => s.user);
  const { c } = useTheme();
  if (user) return <Redirect href={homeRouteFor(user)} />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }} />;
}

import { Redirect, Tabs } from 'expo-router';
import { Settings, UserRound } from 'lucide-react-native';
import { useAuth } from '../../stores/auth';
import { useTheme } from '../../stores/theme';
import { fonts } from '../../components/fonts';

/**
 * Bottom tabs list only destinations that exist. Home, Explore, Create, Reels
 * and Messages are added as their phases ship.
 */
export default function AppLayout() {
  const user = useAuth((s) => s.user);
  const { c } = useTheme();
  if (!user) return <Redirect href="/welcome" />;
  if (user.status !== 'pending_deletion' && (!user.onboardingCompleted || !user.username)) return <Redirect href="/onboarding" />;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: c.text,
      tabBarInactiveTintColor: c.textMuted,
      tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.border },
      tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
      sceneStyle: { backgroundColor: c.bg },
    }}>
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Settings color={color} size={size} /> }} />
    </Tabs>
  );
}

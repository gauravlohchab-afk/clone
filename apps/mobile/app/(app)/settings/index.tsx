import { Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { minTouchTarget } from '@vyro/ui';
import { Screen } from '../../../components/Screen';
import { Button } from '../../../components/Button';
import { Text } from '../../../components/Text';
import { useAuth } from '../../../stores/auth';
import { useTheme } from '../../../stores/theme';

const items: { href: Href; label: string }[] = [
  { href: '/settings/profile', label: 'Edit profile' },
  { href: '/settings/privacy', label: 'Privacy' },
  { href: '/settings/security', label: 'Password and security' },
  { href: '/settings/preferences', label: 'Preferences' },
  { href: '/settings/account', label: 'Your account' },
];

export default function SettingsMenu() {
  const { c } = useTheme();
  const signOut = useAuth((s) => s.signOut);
  return (
    <Screen edges={[]}>
      <View>
        {items.map((i) => (
          <Pressable key={i.label} accessibilityRole="button" onPress={() => router.push(i.href)}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: minTouchTarget + 8, borderBottomWidth: 1, borderBottomColor: c.border, opacity: pressed ? 0.7 : 1 })}>
            <Text style={{ flex: 1 }}>{i.label}</Text>
            <ChevronRight size={18} color={c.textMuted} />
          </Pressable>
        ))}
      </View>
      <Button title="Log out" variant="secondary" onPress={() => void signOut()} />
    </Screen>
  );
}

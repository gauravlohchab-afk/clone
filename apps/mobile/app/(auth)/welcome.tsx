import { View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '@vyro/ui';
import { Wordmark } from '../../components/Brand';
import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { fonts } from '../../components/fonts';
import { brand } from '../../lib/brand';
import { useTheme } from '../../stores/theme';

export default function Welcome() {
  const { c } = useTheme();
  const lines = brand.tagline.split('. ');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, padding: 20 }}>
      <Wordmark />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 160, marginBottom: 32 }}>
          <View style={{ position: 'absolute', left: 0, top: 10, width: 140, height: 140, borderRadius: 28, backgroundColor: palette.violet[500], transform: [{ rotate: '8deg' }] }} />
          <View style={{ position: 'absolute', left: 120, top: 70, width: 80, height: 80, borderRadius: 40, backgroundColor: palette.coral[500] }} />
          <View style={{ position: 'absolute', left: 200, top: 0, width: 56, height: 56, borderRadius: 8, backgroundColor: palette.lime[500] }} />
        </View>
        <Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 48, lineHeight: 50 }}>
          {lines.map((l, i) => (i < lines.length - 1 ? `${l}.\n` : l))}
        </Text>
        <Text variant="muted" style={{ marginTop: 16 }}>Create, connect and discover with people everywhere.</Text>
      </View>
      <View style={{ gap: 12 }}>
        <Button title={`Join ${brand.name}`} onPress={() => router.push('/signup')} />
        <Button title="Log in" variant="secondary" onPress={() => router.push('/login')} />
      </View>
    </SafeAreaView>
  );
}

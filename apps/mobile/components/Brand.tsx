import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { palette } from '@vyro/ui';
import { brand } from '../lib/brand';
import { Text } from './Text';
import { fonts } from './fonts';

export function Mark({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityElementsHidden importantForAccessibility="no">
      <Path d="M8 13h12.5L32 41.5 43.5 13H56L38.6 53H25.4z" fill={palette.lime[500]} />
      <Path d="M32 41.5 25.4 53h13.2z" fill={palette.violet[500]} />
      <Circle cx="52" cy="8.5" r="5" fill={palette.coral[500]} />
    </Svg>
  );
}

export function Wordmark() {
  return (
    <View accessible accessibilityLabel={brand.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Mark size={28} />
      <Text style={{ fontFamily: fonts.display, fontSize: 20, letterSpacing: 2.4 }}>{brand.name}</Text>
    </View>
  );
}

const swatches = [
  { bg: palette.lime[500], fg: palette.ink[900] },
  { bg: palette.violet[500], fg: palette.paper[50] },
  { bg: palette.coral[500], fg: palette.ink[900] },
  { bg: palette.paper[300], fg: palette.ink[900] },
];
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const s = swatches[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % swatches.length]!;
  return (
    <View importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: s.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.display, fontSize: size * 0.42, lineHeight: size * 0.5, color: s.fg }}>{(name[0] ?? '?').toUpperCase()}</Text>
    </View>
  );
}

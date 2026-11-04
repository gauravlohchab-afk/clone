import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { minTouchTarget, radii } from '@vyro/ui';
import { useTheme } from '../stores/theme';
import { fonts } from './fonts';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({ title, variant = 'primary', loading, disabled, style, ...rest }: PressableProps & { title: string; variant?: Variant; loading?: boolean }) {
  const { c } = useTheme();
  const palette = {
    primary: { bg: c.primary, fg: c.onPrimary, border: c.primary },
    secondary: { bg: c.surfaceRaised, fg: c.text, border: c.border },
    ghost: { bg: 'transparent', fg: c.text, border: 'transparent' },
    danger: { bg: 'transparent', fg: c.danger, border: c.danger },
  }[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: isDisabled ? 0.5 : state.pressed ? 0.85 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={palette.fg} /> : <Text style={[styles.label, { color: palette.fg }]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: minTouchTarget + 4, borderRadius: radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  label: { fontFamily: fonts.semibold, fontSize: 15 },
});

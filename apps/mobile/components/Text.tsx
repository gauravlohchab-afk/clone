import { Text as RNText, type TextProps } from 'react-native';
import { typography } from '@vyro/ui';
import { useTheme } from '../stores/theme';
import { fonts } from './fonts';

type Variant = 'title' | 'heading' | 'body' | 'label' | 'muted' | 'small';
const sizes: Record<Variant, { size: number; font: string; muted?: boolean }> = {
  title: { size: typography.scale['3xl'], font: fonts.display },
  heading: { size: typography.scale.lg, font: fonts.display },
  body: { size: typography.scale.base, font: fonts.body },
  label: { size: typography.scale.sm, font: fonts.medium },
  muted: { size: typography.scale.base, font: fonts.body, muted: true },
  small: { size: typography.scale.xs, font: fonts.body, muted: true },
};

export function Text({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  const { c } = useTheme();
  const v = sizes[variant];
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      style={[{ fontFamily: v.font, fontSize: v.size, lineHeight: Math.round(v.size * (variant === 'title' ? 1.1 : 1.45)), color: v.muted ? c.textMuted : c.text }, style]}
      {...rest}
    />
  );
}

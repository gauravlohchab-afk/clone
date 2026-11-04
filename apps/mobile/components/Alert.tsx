import { View } from 'react-native';
import { radii } from '@vyro/ui';
import { useTheme } from '../stores/theme';
import { Text } from './Text';

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success'; children: React.ReactNode }) {
  const { c } = useTheme();
  const border = tone === 'error' ? c.danger : tone === 'success' ? c.primary : c.border;
  return (
    <View accessibilityRole={tone === 'error' ? 'alert' : 'summary'} style={{ borderWidth: 1, borderColor: border, borderRadius: radii.md, padding: 12, backgroundColor: c.surface }}>
      {typeof children === 'string' ? <Text variant="label" style={tone === 'error' ? { color: c.danger } : undefined}>{children}</Text> : children}
    </View>
  );
}

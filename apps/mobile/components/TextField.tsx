import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { minTouchTarget, radii } from '@vyro/ui';
import { useTheme } from '../stores/theme';
import { Text } from './Text';
import { fonts } from './fonts';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  password?: boolean;
  counter?: number;
}

export const TextField = forwardRef<TextInput, Props>(function TextField({ label, error, hint, password, counter, style, value, ...rest }, ref) {
  const { c } = useTheme();
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text variant="label">{label}</Text>
        {counter !== undefined && <Text variant="small">{(value ?? '').length}/{counter}</Text>}
      </View>
      <View>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={c.textMuted}
          secureTextEntry={password && hidden}
          autoCapitalize={password ? 'none' : rest.autoCapitalize}
          value={value}
          style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: error ? c.danger : c.border, paddingRight: password ? 48 : 12 }, style]}
          {...rest}
        />
        {password && (
          <Pressable accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'} onPress={() => setHidden((h) => !h)} style={styles.eye} hitSlop={8}>
            {hidden ? <Eye size={18} color={c.textMuted} /> : <EyeOff size={18} color={c.textMuted} />}
          </Pressable>
        )}
      </View>
      {error ? <Text variant="small" style={{ color: c.danger, fontFamily: fonts.medium }} accessibilityLiveRegion="polite">{error}</Text> : hint ? <Text variant="small">{hint}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  input: { minHeight: minTouchTarget + 4, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: 12, fontSize: 16, fontFamily: fonts.body },
  eye: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, alignItems: 'center', justifyContent: 'center' },
});

import { Pressable, Switch, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { minTouchTarget } from '@vyro/ui';
import { useTheme } from '../stores/theme';
import { Text } from './Text';

export function ToggleRow({ label, description, value, onChange }: { label: string; description?: string; value: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: minTouchTarget }}>
      <View style={{ flex: 1 }}>
        <Text variant="label">{label}</Text>
        {description && <Text variant="small">{description}</Text>}
      </View>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: c.primary, false: c.border }} thumbColor="#FBFAF7" />
    </View>
  );
}

/** Single-choice list; native-feeling replacement for a <select>. */
export function ChoiceList<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: 4 }}>
      <Text variant="label">{label}</Text>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange(o.value)}
            style={{ flexDirection: 'row', alignItems: 'center', minHeight: minTouchTarget, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <Text style={{ flex: 1 }}>{o.label}</Text>
            {on && <Check size={18} color={c.link} />}
          </Pressable>
        );
      })}
    </View>
  );
}

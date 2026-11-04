import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { radii } from '@vyro/ui';
import { useTheme } from '../stores/theme';
import { Text } from './Text';

/** Bottom sheet built on the native Modal; the system back gesture closes it. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" style={{ flex: 1, backgroundColor: 'rgba(17,19,28,0.6)' }} onPress={onClose} />
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: c.surface, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg }}>
        <View accessibilityViewIsModal style={{ padding: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text variant="heading" accessibilityRole="header" style={{ flex: 1 }}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12}><X size={22} color={c.textMuted} /></Pressable>
          </View>
          {children}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

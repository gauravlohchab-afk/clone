import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../stores/theme';
import { Text } from './Text';

export function Screen({ title, subtitle, children, refreshing, onRefresh, edges = ['top', 'bottom'] }: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: ('top' | 'bottom')[];
}) {
  const { c } = useTheme();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.textMuted} /> : undefined}
        >
          {title && (
            <View style={{ gap: 6, marginBottom: 8 }}>
              <Text variant="title" accessibilityRole="header">{title}</Text>
              {subtitle && <Text variant="muted">{subtitle}</Text>}
            </View>
          )}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 12, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: c.border }}>
      <View style={{ gap: 2 }}>
        <Text variant="heading" accessibilityRole="header">{title}</Text>
        {description && <Text variant="small">{description}</Text>}
      </View>
      {children}
    </View>
  );
}

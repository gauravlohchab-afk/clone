import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { X } from 'lucide-react-native';
import type { SettingsDto } from '@vyro/types';
import { Screen, Section } from '../../../components/Screen';
import { ChoiceList, ToggleRow } from '../../../components/Controls';
import { TextField } from '../../../components/TextField';
import { Button } from '../../../components/Button';
import { Alert } from '../../../components/Alert';
import { Text } from '../../../components/Text';
import { api } from '../../../lib/api';
import { errorMessage } from '../../../lib/errors';
import { useSettings } from '../../../lib/useSettings';
import { useAuth } from '../../../stores/auth';
import { useTheme } from '../../../stores/theme';

type Aud = SettingsDto['privacy']['allowMessagesFrom'];
const audience: { value: Aud; label: string }[] = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'following', label: 'People you follow' },
  { value: 'nobody', label: 'No one' },
];

export default function Privacy() {
  const { c } = useTheme();
  const { user, reloadMe } = useAuth();
  const { settings, error, update } = useSettings();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [word, setWord] = useState('');
  if (!settings) return <Screen edges={[]}>{error ? <Alert tone="error">{error}</Alert> : <Text variant="muted">Loading…</Text>}</Screen>;
  const p = settings.privacy;
  return (
    <Screen edges={[]}>
      {(error || profileError) && <Alert tone="error">{error ?? profileError ?? ''}</Alert>}
      <Section title="Account privacy">
        <ToggleRow label="Private account" description="Only people you approve can see your posts and followers." value={!!user?.profile?.isPrivate}
          onChange={async (v) => {
            setProfileError(null);
            try { await api.patch('/api/v1/me/profile', { isPrivate: v }); await reloadMe(); } catch (e) { setProfileError(errorMessage(e)); }
          }} />
        <ToggleRow label="Show activity status" value={p.showActivityStatus} onChange={(v) => void update({ privacy: { showActivityStatus: v } })} />
      </Section>
      <Section title="Interactions">
        <ChoiceList label="Who can message you" value={p.allowMessagesFrom} options={audience} onChange={(v) => void update({ privacy: { allowMessagesFrom: v } })} />
        <ChoiceList label="Who can mention you" value={p.allowMentionsFrom} options={audience} onChange={(v) => void update({ privacy: { allowMentionsFrom: v } })} />
        <ChoiceList label="Who can comment" value={p.allowCommentsFrom}
          options={[{ value: 'everyone', label: 'Everyone' }, { value: 'followers', label: 'Your followers' }, { value: 'following', label: 'People you follow' }, { value: 'nobody', label: 'No one' }]}
          onChange={(v) => void update({ privacy: { allowCommentsFrom: v } })} />
      </Section>
      <Section title="Hidden words" description="Comments and message requests containing these will be hidden from you.">
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}><TextField label="Add a word or phrase" maxLength={40} value={word} onChangeText={setWord} autoCapitalize="none" /></View>
          <Button title="Add" variant="secondary" onPress={async () => {
            const w = word.trim().toLowerCase();
            if (!w || p.hiddenWords.includes(w)) return;
            if (await update({ privacy: { hiddenWords: [...p.hiddenWords, w] } })) setWord('');
          }} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {p.hiddenWords.map((w) => (
            <View key={w} style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: c.border, borderRadius: 20, paddingLeft: 12 }}>
              <Text variant="label">{w}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${w}`} onPress={() => void update({ privacy: { hiddenWords: p.hiddenWords.filter((x) => x !== w) } })} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} color={c.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      </Section>
    </Screen>
  );
}

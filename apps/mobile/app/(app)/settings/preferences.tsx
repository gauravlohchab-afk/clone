import { getCalendars } from 'expo-localization';
import type { SettingsDto } from '@vyro/types';
import { Screen, Section } from '../../../components/Screen';
import { ChoiceList, ToggleRow } from '../../../components/Controls';
import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { Text } from '../../../components/Text';
import { useSettings } from '../../../lib/useSettings';
import { useThemePref } from '../../../stores/theme';

export default function Preferences() {
  const { settings, error, update } = useSettings();
  const setPref = useThemePref((s) => s.setPref);
  if (!settings) return <Screen edges={[]}>{error ? <Alert tone="error">{error}</Alert> : <Text variant="muted">Loading…</Text>}</Screen>;
  const n = settings.notifications;
  const deviceTz = getCalendars()[0]?.timeZone ?? null;
  const setN = (k: keyof SettingsDto['notifications']) => (v: boolean) => void update({ notifications: { [k]: v } });
  return (
    <Screen edges={[]}>
      {error && <Alert tone="error">{error}</Alert>}
      <Section title="Display">
        <ChoiceList label="Theme" value={settings.theme}
          options={[{ value: 'system', label: 'Match my device' }, { value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]}
          onChange={(theme) => { setPref(theme); void update({ theme }); }} />
      </Section>
      <Section title="Language and region" description="English is the only app language today; your choice is saved for when more arrive.">
        <ChoiceList label="Language" value={settings.language} options={[{ value: 'en', label: 'English' }]} onChange={(language) => void update({ language })} />
        <Text variant="label">Time zone: {settings.timezone}</Text>
        {deviceTz && deviceTz !== settings.timezone && (
          <Button title={`Use this device's time zone (${deviceTz})`} variant="secondary" onPress={() => void update({ timezone: deviceTz })} />
        )}
      </Section>
      <Section title="Notifications" description="Delivery starts as each feature ships.">
        <ToggleRow label="Likes" value={n.likes} onChange={setN('likes')} />
        <ToggleRow label="Comments" value={n.comments} onChange={setN('comments')} />
        <ToggleRow label="New followers" value={n.follows} onChange={setN('follows')} />
        <ToggleRow label="Mentions" value={n.mentions} onChange={setN('mentions')} />
        <ToggleRow label="Messages" value={n.messages} onChange={setN('messages')} />
        <ToggleRow label="Email notifications" value={n.email} onChange={setN('email')} />
        <ToggleRow label="Push notifications" value={n.push} onChange={setN('push')} />
      </Section>
    </Screen>
  );
}

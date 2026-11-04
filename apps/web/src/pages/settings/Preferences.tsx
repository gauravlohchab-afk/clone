import type { SettingsDto } from '@vyro/types';
import { Select, Toggle } from '../../components/Controls';
import { Alert } from '../../components/Alert';
import { FullPageSpinner } from '../../components/Spinner';
import { useSettings } from '../../lib/useSettings';
import { applyTheme } from '../../stores/theme';
import { SettingsSection } from './SettingsLayout';

const timezones: string[] = (() => {
  try { return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf('timeZone'); } catch { return ['UTC']; }
})();
const regionNames = (() => { try { return new Intl.DisplayNames(['en'], { type: 'region' }); } catch { return null; } })();
const countries = 'AE AR AU BD BR CA CH CN CO DE EG ES FR GB GH ID IE IN IT JP KE KR MX MY NG NL NZ PH PK PL PT SA SE SG TH TR TW UA US VN ZA'.split(' ');

/** Only English UI ships today; the setting is stored now so localisation can pick it up. */
const languages = [{ code: 'en', name: 'English' }];

export function Preferences() {
  const { settings, error, update } = useSettings();
  if (!settings) return error ? <Alert tone="error">{error}</Alert> : <FullPageSpinner />;
  const n = settings.notifications;
  const setN = (k: keyof SettingsDto['notifications']) => (v: boolean) => void update({ notifications: { [k]: v } });

  return (
    <div>
      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}
      <SettingsSection title="Display">
        <Select label="Theme" value={settings.theme} onChange={(e) => {
          const theme = e.target.value as SettingsDto['theme'];
          applyTheme(theme);
          void update({ theme });
        }}>
          <option value="system">Match my device</option>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </Select>
      </SettingsSection>
      <SettingsSection title="Language and region">
        <div className="space-y-4">
          <Select label="Language" value={settings.language} onChange={(e) => void update({ language: e.target.value })}>
            {languages.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </Select>
          <Select label="Country or region" value={settings.country} onChange={(e) => void update({ country: e.target.value })}>
            <option value="">Not set</option>
            {countries.map((c) => <option key={c} value={c}>{regionNames?.of(c) ?? c}</option>)}
          </Select>
          <Select label="Time zone" value={settings.timezone} onChange={(e) => void update({ timezone: e.target.value })}>
            {!timezones.includes(settings.timezone) && <option value={settings.timezone}>{settings.timezone}</option>}
            {timezones.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </Select>
        </div>
      </SettingsSection>
      <SettingsSection title="Notifications" description="Choose what you hear about. Delivery starts as each feature ships.">
        <Toggle label="Likes" checked={n.likes} onChange={setN('likes')} />
        <Toggle label="Comments" checked={n.comments} onChange={setN('comments')} />
        <Toggle label="New followers" checked={n.follows} onChange={setN('follows')} />
        <Toggle label="Mentions" checked={n.mentions} onChange={setN('mentions')} />
        <Toggle label="Messages" checked={n.messages} onChange={setN('messages')} />
        <Toggle label="Email notifications" checked={n.email} onChange={setN('email')} />
        <Toggle label="Push notifications" checked={n.push} onChange={setN('push')} />
      </SettingsSection>
    </div>
  );
}

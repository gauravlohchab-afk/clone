import { useState } from 'react';
import { X } from 'lucide-react';
import type { ProfileDto, SettingsDto } from '@vyro/types';
import { Toggle, Select } from '../../components/Controls';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { TextField } from '../../components/Field';
import { FullPageSpinner } from '../../components/Spinner';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/form-errors';
import { useSettings } from '../../lib/useSettings';
import { useAuth } from '../../stores/auth';
import { SettingsSection } from './SettingsLayout';

type Audience = SettingsDto['privacy']['allowMessagesFrom'];

export function Privacy() {
  const { user, reloadMe } = useAuth();
  const { settings, error, update } = useSettings();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [word, setWord] = useState('');
  if (!settings) return error ? <Alert tone="error">{error}</Alert> : <FullPageSpinner />;
  const p = settings.privacy;

  return (
    <div>
      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}
      <SettingsSection title="Account privacy">
        {profileError && <Alert tone="error">{profileError}</Alert>}
        <Toggle label="Private account" description="Only people you approve can see your posts and followers."
          checked={!!user?.profile?.isPrivate}
          onChange={async (v) => {
            setProfileError(null);
            try { await api.patch<ProfileDto>('/api/v1/me/profile', { isPrivate: v }); await reloadMe(); }
            catch (e) { setProfileError(errorMessage(e)); }
          }} />
        <Toggle label="Show activity status" description="Let people you follow and message see when you were last active."
          checked={p.showActivityStatus} onChange={(v) => void update({ privacy: { showActivityStatus: v } })} />
      </SettingsSection>

      <SettingsSection title="Interactions">
        <div className="space-y-4">
          <Select label="Who can message you" value={p.allowMessagesFrom} onChange={(e) => void update({ privacy: { allowMessagesFrom: e.target.value as Audience } })}>
            <option value="everyone">Everyone (others go to requests)</option>
            <option value="following">People you follow</option>
            <option value="nobody">No one</option>
          </Select>
          <Select label="Who can mention you" value={p.allowMentionsFrom} onChange={(e) => void update({ privacy: { allowMentionsFrom: e.target.value as Audience } })}>
            <option value="everyone">Everyone</option>
            <option value="following">People you follow</option>
            <option value="nobody">No one</option>
          </Select>
          <Select label="Who can comment on your posts" value={p.allowCommentsFrom} onChange={(e) => void update({ privacy: { allowCommentsFrom: e.target.value as SettingsDto['privacy']['allowCommentsFrom'] } })}>
            <option value="everyone">Everyone</option>
            <option value="followers">Your followers</option>
            <option value="following">People you follow</option>
            <option value="nobody">No one</option>
          </Select>
        </div>
      </SettingsSection>

      <SettingsSection title="Hidden words" description="Comments and message requests containing these words will be hidden from you.">
        <form className="flex items-end gap-2" onSubmit={(e) => {
          e.preventDefault();
          const w = word.trim().toLowerCase();
          if (!w || p.hiddenWords.includes(w)) return;
          void update({ privacy: { hiddenWords: [...p.hiddenWords, w] } }).then((ok) => ok && setWord(''));
        }}>
          <TextField className="flex-1" label="Add a word or phrase" maxLength={40} value={word} onChange={(e) => setWord(e.target.value)} />
          <Button type="submit" variant="secondary">Add</Button>
        </form>
        {p.hiddenWords.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {p.hiddenWords.map((w) => (
              <li key={w} className="inline-flex items-center gap-1 rounded-full border border-line py-1 pl-3 pr-1 text-sm">
                {w}
                <button type="button" aria-label={`Remove ${w}`} onClick={() => void update({ privacy: { hiddenWords: p.hiddenWords.filter((x) => x !== w) } })} className="flex size-7 items-center justify-center rounded-full hover:bg-raised"><X className="size-3.5" /></button>
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>
    </div>
  );
}

import { useState } from 'react';
import { Alert as NativeAlert, Pressable, View } from 'react-native';
import { Ban, EyeOff, MoreHorizontal, ShieldMinus, UserMinus } from 'lucide-react-native';
import type { RelationshipDto } from '@vyro/types';
import { minTouchTarget } from '@vyro/ui';
import { social } from '../../lib/social';
import { errorMessage } from '../../lib/errors';
import { useTheme } from '../../stores/theme';
import { Sheet } from '../Sheet';
import { Button } from '../Button';
import { ToggleRow } from '../Controls';
import { Alert } from '../Alert';
import { Text } from '../Text';
import { fonts } from '../fonts';

/** The "…" sheet on someone else's profile: remove follower, restrict, mute, block. */
export function ProfileActions({ username, relationship: r, onChange }: { username: string; relationship: RelationshipDto; onChange: (r: RelationshipDto) => void }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [muting, setMuting] = useState(false);
  const [mute, setMute] = useState(r.muting ?? { posts: true, stories: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => { setOpen(false); setMuting(false); setError(null); };
  async function run(fn: () => Promise<unknown>, patch?: Partial<RelationshipDto>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      const next = res && typeof res === 'object' && 'blocking' in res ? (res as RelationshipDto) : r;
      onChange({ ...next, ...patch });
      close();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  const confirmBlock = () =>
    NativeAlert.alert(r.blocking ? `Unblock @${username}?` : `Block @${username}?`,
      r.blocking ? "They'll be able to see your profile and follow you again. They won't be told." : "They won't be able to find your profile or see what you share, and you'll stop following each other. They won't be told.",
      [{ text: 'Cancel', style: 'cancel' }, { text: r.blocking ? 'Unblock' : 'Block', style: r.blocking ? 'default' : 'destructive', onPress: () => void run(() => (r.blocking ? social.unblock(username) : social.block(username))) }]);

  const Row = ({ icon: Icon, label, hint, danger, onPress }: { icon: typeof Ban; label: string; hint?: string; danger?: boolean; onPress: () => void }) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} disabled={busy} onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: minTouchTarget + 8, opacity: pressed || busy ? 0.6 : 1 })}>
      <Icon size={20} color={danger ? c.danger : c.text} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.medium, color: danger ? c.danger : c.text }}>{label}</Text>
        {hint && <Text variant="small">{hint}</Text>}
      </View>
    </Pressable>
  );

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`More options for @${username}`} onPress={() => setOpen(true)}
        style={{ minHeight: minTouchTarget + 4, width: minTouchTarget + 4, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceRaised }}>
        <MoreHorizontal size={20} color={c.text} />
      </Pressable>
      <Sheet open={open} onClose={close} title={muting ? `Mute @${username}` : `@${username}`}>
        {error && <Alert tone="error">{error}</Alert>}
        {muting ? (
          <View style={{ gap: 4 }}>
            <ToggleRow label="Mute posts" value={mute.posts} onChange={(posts) => setMute((m) => ({ ...m, posts }))} />
            <ToggleRow label="Mute stories" value={mute.stories} onChange={(stories) => setMute((m) => ({ ...m, stories }))} />
            <Text variant="small">You'll still follow them, and they won't know you muted them.</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Button title="Back" variant="ghost" style={{ flex: 1 }} onPress={() => setMuting(false)} />
              <Button title="Mute" style={{ flex: 1 }} loading={busy} disabled={!mute.posts && !mute.stories} onPress={() => void run(() => social.mute(username, mute))} />
            </View>
          </View>
        ) : (
          <View>
            {r.followedBy && !r.blocking && <Row icon={UserMinus} label="Remove follower" onPress={() => void run(() => social.removeFollower(username), { followedBy: false })} />}
            {!r.blocking && <Row icon={ShieldMinus} label={r.restricting ? 'Unrestrict' : 'Restrict'} hint={r.restricting ? 'Their interactions will be visible to everyone again.' : 'Limit their interactions without them knowing.'}
              onPress={() => void run(() => (r.restricting ? social.unrestrict(username) : social.restrict(username)))} />}
            {!r.blocking && <Row icon={EyeOff} label={r.muting ? 'Unmute' : 'Mute'} hint={r.muting ? 'Show their posts and stories again.' : "Hide their posts or stories. They won't be told."}
              onPress={() => (r.muting ? void run(() => social.unmute(username)) : setMuting(true))} />}
            <Row icon={Ban} label={r.blocking ? 'Unblock' : 'Block'} danger onPress={confirmBlock} />
          </View>
        )}
      </Sheet>
    </>
  );
}

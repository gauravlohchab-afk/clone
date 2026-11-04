import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { MutedAccountDto, ProfileSummaryDto } from '@vyro/types';
import { social } from '../../../lib/social';
import { useCursorList } from '../../../lib/useCursorList';
import { errorMessage } from '../../../lib/errors';
import { useTheme } from '../../../stores/theme';
import { Screen } from '../../../components/Screen';
import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { Text } from '../../../components/Text';
import { fonts } from '../../../components/fonts';
import { ProfileRow } from '../../../components/social/ProfileRow';

type Kind = 'blocked' | 'restricted' | 'muted';
const tabs: { kind: Kind; label: string; empty: string; undo: string }[] = [
  { kind: 'blocked', label: 'Blocked', empty: "You haven't blocked anyone.", undo: 'Unblock' },
  { kind: 'restricted', label: 'Restricted', empty: "You haven't restricted anyone.", undo: 'Unrestrict' },
  { kind: 'muted', label: 'Muted', empty: "You haven't muted anyone.", undo: 'Unmute' },
];
const mutedWhat = (m: MutedAccountDto['muting']) => (m.posts && m.stories ? 'Posts and stories muted' : m.posts ? 'Posts muted' : 'Stories muted');

export default function HiddenAccounts() {
  const { c } = useTheme();
  const [kind, setKind] = useState<Kind>('blocked');
  const tab = tabs.find((t) => t.kind === kind)!;
  const load = useCallback((cur?: string | null) => social.safetyList(kind, cur), [kind]);
  const list = useCursorList<ProfileSummaryDto | MutedAccountDto>(load, kind);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function undo(p: ProfileSummaryDto) {
    setBusy(p.userId);
    setError(null);
    try {
      await (kind === 'blocked' ? social.unblock(p.username) : kind === 'restricted' ? social.unrestrict(p.username) : social.unmute(p.username));
      list.setItems((xs) => xs.filter((x) => x.userId !== p.userId));
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(null); }
  }

  return (
    <Screen edges={[]} refreshing={false} onRefresh={() => void list.reload()}>
      <Text variant="small">People aren't told when you block, restrict or mute them, or when you undo it.</Text>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.border }}>
        {tabs.map((t) => (
          <Pressable key={t.kind} accessibilityRole="tab" accessibilityState={{ selected: t.kind === kind }} onPress={() => setKind(t.kind)}
            style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: t.kind === kind ? c.text : 'transparent' }}>
            <Text style={{ fontFamily: fonts.semibold, color: t.kind === kind ? c.text : c.textMuted }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {(error || list.error) && <Alert tone="error">{error || list.error}</Alert>}
      {list.loading && <Text variant="muted">Loading…</Text>}
      {!list.loading && !list.error && list.items.length === 0 && <Text variant="muted" style={{ textAlign: 'center', paddingVertical: 32 }}>{tab.empty}</Text>}
      <View>
        {list.items.map((p) => (
          <ProfileRow key={p.userId} profile={p} sub={'muting' in p ? mutedWhat(p.muting) : undefined}
            action={<Button title={tab.undo} variant="secondary" loading={busy === p.userId} disabled={!!busy} style={{ minHeight: 36, paddingHorizontal: 14 }} onPress={() => void undo(p)} />} />
        ))}
      </View>
      {list.hasMore && <Button title="Load more" variant="secondary" loading={list.loadingMore} onPress={() => void list.loadMore()} />}
    </Screen>
  );
}

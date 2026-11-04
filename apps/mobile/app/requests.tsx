import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { FollowRequestDto } from '@vyro/types';
import { social } from '../lib/social';
import { useCursorList } from '../lib/useCursorList';
import { errorMessage } from '../lib/errors';
import { useTheme } from '../stores/theme';
import { Screen } from '../components/Screen';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { ProfileRow } from '../components/social/ProfileRow';

export default function FollowRequestsScreen() {
  const { c } = useTheme();
  const load = useCallback((cur?: string | null) => social.requests(cur), []);
  const list = useCursorList<FollowRequestDto>(load, 'requests');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(r: FollowRequestDto, approve: boolean) {
    setBusy(r.id);
    setError(null);
    try {
      await (approve ? social.approve(r.id) : social.decline(r.id));
      list.setItems((xs) => xs.filter((x) => x.id !== r.id));
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(null); }
  }

  return (
    <Screen refreshing={false} onRefresh={() => void list.reload()}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}><ArrowLeft size={22} color={c.text} /></Pressable>
        <Text variant="heading" accessibilityRole="header">Follow requests</Text>
      </View>
      <Text variant="small">Only people you approve can see your posts while your account is private.</Text>
      {(error || list.error) && <Alert tone="error">{error || list.error}</Alert>}
      {list.loading && <Text variant="muted">Loading…</Text>}
      {!list.loading && !list.error && list.items.length === 0 && <Text variant="muted" style={{ textAlign: 'center', paddingVertical: 32 }}>No pending requests.</Text>}
      <View>
        {list.items.map((r) => (
          <ProfileRow key={r.id} profile={r.from} action={
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Button title="Confirm" accessibilityLabel={`Confirm @${r.from.username}`} loading={busy === r.id} disabled={!!busy} style={{ minHeight: 36, paddingHorizontal: 14 }} onPress={() => void act(r, true)} />
              <Button title="Delete" accessibilityLabel={`Delete request from @${r.from.username}`} variant="secondary" disabled={!!busy} style={{ minHeight: 36, paddingHorizontal: 14 }} onPress={() => void act(r, false)} />
            </View>
          } />
        ))}
      </View>
      {list.hasMore && <Button title="Load more" variant="secondary" loading={list.loadingMore} onPress={() => void list.loadMore()} />}
    </Screen>
  );
}

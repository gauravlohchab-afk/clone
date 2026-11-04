import { useCallback } from 'react';
import { Alert as NativeAlert, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ProfileSummaryDto } from '@vyro/types';
import { social, type ConnectionKind } from '../../lib/social';
import { useCursorList } from '../../lib/useCursorList';
import { errorMessage } from '../../lib/errors';
import { useAuth } from '../../stores/auth';
import { useTheme } from '../../stores/theme';
import { Screen } from '../Screen';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { Text } from '../Text';
import { fonts } from '../fonts';
import { ProfileRow } from './ProfileRow';
import { FollowButton } from './FollowButton';

export function Connections({ username, kind }: { username: string; kind: ConnectionKind }) {
  const { c } = useTheme();
  const me = useAuth((s) => s.user);
  const own = me?.username === username.toLowerCase();
  const load = useCallback((cur?: string | null) => social.connections(username, kind, cur), [username, kind]);
  const list = useCursorList<ProfileSummaryDto>(load, `${username}:${kind}`);

  const remove = (p: ProfileSummaryDto) =>
    NativeAlert.alert('Remove follower?', `VYRO won't tell @${p.username} they were removed from your followers.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await social.removeFollower(p.username); list.setItems((xs) => xs.filter((x) => x.userId !== p.userId)); }
        catch (e) { NativeAlert.alert('Could not remove', errorMessage(e)); }
      } },
    ]);

  const tab = (k: ConnectionKind, label: string) => (
    <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: k === kind }} onPress={() => k !== kind && router.replace(`/u/${username}/${k}`)}
      style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: k === kind ? c.text : 'transparent' }}>
      <Text style={{ fontFamily: fonts.semibold, color: k === kind ? c.text : c.textMuted }}>{label}</Text>
    </Pressable>
  );

  return (
    <Screen refreshing={false} onRefresh={() => void list.reload()}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace(`/u/${username}`))}><ArrowLeft size={22} color={c.text} /></Pressable>
        <Text variant="heading" accessibilityRole="header">@{username}</Text>
      </View>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.border }}>
        {tab('followers', 'Followers')}
        {tab('following', 'Following')}
      </View>
      {list.error && <Alert tone={/private/i.test(list.error) ? 'info' : 'error'}>{list.error}</Alert>}
      {list.loading && <Text variant="muted">Loading…</Text>}
      {!list.loading && !list.error && list.items.length === 0 && (
        <Text variant="muted" style={{ textAlign: 'center', paddingVertical: 32 }}>
          {kind === 'followers' ? (own ? 'When people follow you, they’ll appear here.' : 'No followers yet.') : own ? 'Accounts you follow will appear here.' : 'Not following anyone yet.'}
        </Text>
      )}
      <View>
        {list.items.map((p) => (
          <ProfileRow key={p.userId} profile={p} action={
            own && kind === 'followers' ? <Button title="Remove" variant="secondary" style={{ minHeight: 36, paddingHorizontal: 16 }} onPress={() => remove(p)} />
              : me && p.relationship && !p.relationship.isSelf ? <FollowButton compact username={p.username} isPrivate={p.isPrivate} state={p.relationship} /> : null
          } />
        ))}
      </View>
      {list.hasMore && <Button title="Load more" variant="secondary" loading={list.loadingMore} onPress={() => void list.loadMore()} />}
    </Screen>
  );
}

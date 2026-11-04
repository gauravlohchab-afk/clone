import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, Share, View } from 'react-native';
import { router } from 'expo-router';
import { BadgeCheck, Globe, Lock, MapPin } from 'lucide-react-native';
import type { ProfileSummaryDto, PublicProfileDto, RelationshipDto } from '@vyro/types';
import { ApiError, formatCount } from '@vyro/shared';
import { api } from '../lib/api';
import { errorMessage } from '../lib/errors';
import { webUrl } from '../lib/links';
import { useTheme } from '../stores/theme';
import { Avatar } from './Brand';
import { Alert } from './Alert';
import { Button } from './Button';
import { Screen } from './Screen';
import { Text } from './Text';
import { fonts } from './fonts';
import { social } from '../lib/social';
import { useAuth } from '../stores/auth';
import { FollowButton } from './social/FollowButton';
import { ProfileActions } from './social/ProfileActions';

export function ProfileView({ username }: { username: string }) {
  const { c } = useTheme();
  const [profile, setProfile] = useState<PublicProfileDto | null>(null);
  const [error, setError] = useState<{ notFound: boolean; message: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mutuals, setMutuals] = useState<{ items: ProfileSummaryDto[]; total: number } | null>(null);
  const signedIn = useAuth((s) => s.status === 'signed_in');

  const load = useCallback(async () => {
    try {
      setProfile(await api.get<PublicProfileDto>(`/api/v1/users/${encodeURIComponent(username)}`));
      setError(null);
    } catch (e) {
      setError({ notFound: e instanceof ApiError && e.status === 404, message: errorMessage(e) });
    }
  }, [username]);
  useEffect(() => { void load(); }, [load]);

  const rel = profile?.viewer.relationship ?? null;
  useEffect(() => {
    setMutuals(null);
    if (!signedIn || !profile || !rel || rel.isSelf || rel.blocking) return;
    let live = true;
    social.mutuals(profile.username, 3).then((m) => live && setMutuals(m)).catch(() => undefined);
    return () => { live = false; };
  }, [signedIn, profile?.username, rel?.isSelf, rel?.blocking]); // eslint-disable-line react-hooks/exhaustive-deps

  const setRelationship = (r: RelationshipDto) => {
    setProfile((p) => (p ? { ...p, viewer: { ...p.viewer, relationship: r } } : p));
    void load();
  };

  if (error) return <Screen title={error.notFound ? 'Not found' : 'Something went wrong'}><Alert tone="error">{error.notFound ? "This account doesn't exist or isn't available." : error.message}</Alert></Screen>;
  if (!profile) return <Screen><Text variant="muted">Loading profile…</Text></Screen>;

  const stats = [['posts', profile.counts.posts], ['followers', profile.counts.followers], ['following', profile.counts.following]] as const;
  const openList = (label: string) => (label !== 'posts' && profile.viewer.canViewContent ? () => router.push(`/u/${profile.username}/${label}`) : undefined);
  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Avatar name={profile.displayName || profile.username} size={84} />
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
          {stats.map(([label, n]) => {
            const onPress = openList(label);
            return (
              <Pressable key={label} disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? 'link' : undefined} accessibilityLabel={`${n} ${label}`} style={{ alignItems: 'center', minWidth: 64, minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 20 }}>{formatCount(n)}</Text>
                <Text variant="small">{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="heading" accessibilityRole="header">{profile.username}</Text>
          {profile.isVerified && <BadgeCheck size={18} color={c.secondary} accessibilityLabel="Verified account" />}
          {profile.isPrivate && <Lock size={14} color={c.textMuted} accessibilityLabel="Private account" />}
          {rel?.followedBy && !rel.isSelf && <Text variant="small" style={{ backgroundColor: c.surfaceRaised, paddingHorizontal: 6, borderRadius: 4 }}>Follows you</Text>}
        </View>
        {!!profile.displayName && <Text style={{ fontFamily: fonts.semibold }}>{profile.displayName}</Text>}
        {profile.accountType !== 'personal' && <Text variant="small">{profile.category || profile.accountType}</Text>}
        {!!profile.bio && <Text>{profile.bio}</Text>}
        {!!profile.location && <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}><MapPin size={14} color={c.textMuted} /><Text variant="small">{profile.location}</Text></View>}
        {!!profile.website && (
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <Globe size={14} color={c.link} />
            <Text accessibilityRole="link" style={{ color: c.link, fontFamily: fonts.medium }} onPress={() => void Linking.openURL(profile.website)}>{profile.website.replace(/^https?:\/\//, '')}</Text>
          </View>
        )}
      </View>
      {mutuals && mutuals.total > 0 && (
        <Text variant="small">
          Followed by {mutuals.items.map((m) => m.username).join(', ')}
          {mutuals.total > mutuals.items.length ? ` and ${formatCount(mutuals.total - mutuals.items.length)} ${mutuals.total - mutuals.items.length === 1 ? 'other' : 'others'}` : ''}
        </Text>
      )}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {profile.viewer.isSelf && <Button title="Edit profile" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/settings/profile')} />}
        {rel && !rel.isSelf && !rel.blocking && <FollowButton username={profile.username} isPrivate={profile.isPrivate} state={rel} onChange={(r) => setRelationship(r.relationship)} />}
        <Button title="Share" variant="secondary" style={{ flex: 1 }} onPress={() => void Share.share({ message: webUrl(`/${profile.username}`) })} />
        {rel && !rel.isSelf && <ProfileActions username={profile.username} relationship={rel} onChange={setRelationship} />}
      </View>
      {profile.viewer.isSelf && profile.isPrivate && <Button title="Follow requests" variant="ghost" onPress={() => router.push('/requests')} />}
      <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingVertical: 40, alignItems: 'center', gap: 6 }}>
        {rel?.blocking ? (
          <>
            <Text variant="heading">You blocked @{profile.username}</Text>
            <Text variant="small" style={{ textAlign: 'center' }}>Unblock them from the ••• menu to see their posts and follow each other again.</Text>
          </>
        ) : profile.viewer.canViewContent ? (
          <>
            <Text variant="heading">No posts yet</Text>
            <Text variant="small" style={{ textAlign: 'center' }}>{profile.viewer.isSelf ? 'When you share photos and videos, they will appear here.' : 'Posts will appear here once they share something.'}</Text>
          </>
        ) : (
          <>
            <Lock size={28} color={c.textMuted} />
            <Text variant="heading">This account is private</Text>
            <Text variant="small" style={{ textAlign: 'center' }}>{rel?.requested ? 'Your follow request is pending. You’ll see their posts once they approve it.' : 'Follow this account to see their photos and videos.'}</Text>
          </>
        )}
      </View>
    </Screen>
  );
}

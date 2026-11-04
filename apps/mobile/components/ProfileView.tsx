import { useCallback, useEffect, useState } from 'react';
import { Linking, Share, View } from 'react-native';
import { router } from 'expo-router';
import { BadgeCheck, Globe, Lock, MapPin } from 'lucide-react-native';
import type { PublicProfileDto } from '@vyro/types';
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

export function ProfileView({ username }: { username: string }) {
  const { c } = useTheme();
  const [profile, setProfile] = useState<PublicProfileDto | null>(null);
  const [error, setError] = useState<{ notFound: boolean; message: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setProfile(await api.get<PublicProfileDto>(`/api/v1/users/${encodeURIComponent(username)}`));
      setError(null);
    } catch (e) {
      setError({ notFound: e instanceof ApiError && e.status === 404, message: errorMessage(e) });
    }
  }, [username]);
  useEffect(() => { void load(); }, [load]);

  if (error) return <Screen title={error.notFound ? 'Not found' : 'Something went wrong'}><Alert tone="error">{error.notFound ? "This account doesn't exist or isn't available." : error.message}</Alert></Screen>;
  if (!profile) return <Screen><Text variant="muted">Loading profile…</Text></Screen>;

  const stats = [['posts', profile.counts.posts], ['followers', profile.counts.followers], ['following', profile.counts.following]] as const;
  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Avatar name={profile.displayName || profile.username} size={84} />
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
          {stats.map(([label, n]) => (
            <View key={label} accessible accessibilityLabel={`${n} ${label}`} style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 20 }}>{formatCount(n)}</Text>
              <Text variant="small">{label}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="heading" accessibilityRole="header">{profile.username}</Text>
          {profile.isVerified && <BadgeCheck size={18} color={c.secondary} accessibilityLabel="Verified account" />}
          {profile.isPrivate && <Lock size={14} color={c.textMuted} accessibilityLabel="Private account" />}
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
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {profile.viewer.isSelf && <Button title="Edit profile" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/settings/profile')} />}
        <Button title="Share" variant="secondary" style={{ flex: 1 }} onPress={() => void Share.share({ message: webUrl(`/${profile.username}`) })} />
      </View>
      <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingVertical: 40, alignItems: 'center', gap: 6 }}>
        {profile.viewer.canViewContent ? (
          <>
            <Text variant="heading">No posts yet</Text>
            <Text variant="small" style={{ textAlign: 'center' }}>{profile.viewer.isSelf ? 'When you share photos and videos, they will appear here.' : 'Posts will appear here once they share something.'}</Text>
          </>
        ) : (
          <>
            <Lock size={28} color={c.textMuted} />
            <Text variant="heading">This account is private</Text>
            <Text variant="small">Only approved followers can see their posts.</Text>
          </>
        )}
      </View>
    </Screen>
  );
}

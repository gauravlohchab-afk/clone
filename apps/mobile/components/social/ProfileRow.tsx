import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { BadgeCheck } from 'lucide-react-native';
import type { ProfileSummaryDto } from '@vyro/types';
import { useTheme } from '../../stores/theme';
import { Avatar } from '../Brand';
import { Text } from '../Text';
import { fonts } from '../fonts';

export function ProfileRow({ profile, action, sub }: { profile: ProfileSummaryDto; action?: ReactNode; sub?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      <Pressable accessibilityRole="link" accessibilityLabel={`@${profile.username}`} onPress={() => router.push(`/u/${profile.username}`)}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={profile.displayName || profile.username} size={44} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text numberOfLines={1} style={{ fontFamily: fonts.semibold, fontSize: 14 }}>{profile.username}</Text>
            {profile.isVerified && <BadgeCheck size={14} color={c.secondary} accessibilityLabel="Verified account" />}
          </View>
          <Text variant="small" numberOfLines={1}>{sub ?? profile.displayName}</Text>
        </View>
      </Pressable>
      {action}
    </View>
  );
}

import { useEffect, useState } from 'react';
import { Alert as NativeAlert, View } from 'react-native';
import type { FollowResultDto } from '@vyro/types';
import { followLabel, social } from '../../lib/social';
import { errorMessage } from '../../lib/errors';
import { Button } from '../Button';
import { Text } from '../Text';
import { useTheme } from '../../stores/theme';

interface Props {
  username: string;
  isPrivate: boolean;
  state: { following: boolean; requested: boolean; followedBy?: boolean };
  onChange?: (r: FollowResultDto) => void;
  compact?: boolean;
}

/** Follow / Following / Requested. Unfollowing a private account asks first. */
export function FollowButton({ username, isPrivate, state, onChange, compact }: Props) {
  const { c } = useTheme();
  const [current, setCurrent] = useState(state);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setCurrent(state), [state.following, state.requested, state.followedBy]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(fn: () => Promise<FollowResultDto>) {
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      setCurrent({ following: r.relationship.following, requested: r.relationship.requested, followedBy: r.relationship.followedBy });
      onChange?.(r);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  const active = current.following || current.requested;
  const press = () => {
    if (!active) return void run(() => social.follow(username));
    if (current.following && isPrivate) {
      return NativeAlert.alert(`Unfollow @${username}?`, "This account is private. To see their posts again you'll need to send a new follow request.", [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unfollow', style: 'destructive', onPress: () => void run(() => social.unfollow(username)) },
      ]);
    }
    return void run(() => social.unfollow(username));
  };

  return (
    <View style={compact ? undefined : { flex: 1 }}>
      <Button title={followLabel(current)} variant={active ? 'secondary' : 'primary'} loading={busy} onPress={press}
        accessibilityLabel={active ? `${followLabel(current)} @${username}` : `Follow @${username}`}
        style={compact ? { minHeight: 36, paddingHorizontal: 16 } : undefined} />
      {error && <Text accessibilityRole="alert" variant="small" style={{ color: c.danger, marginTop: 4 }}>{error}</Text>}
    </View>
  );
}

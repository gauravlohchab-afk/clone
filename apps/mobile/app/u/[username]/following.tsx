import { useLocalSearchParams } from 'expo-router';
import { Connections } from '../../../components/social/Connections';

export default function FollowingScreen() {
  const { username = '' } = useLocalSearchParams<{ username: string }>();
  return <Connections username={String(username)} kind="following" />;
}

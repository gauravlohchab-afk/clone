import { useLocalSearchParams } from 'expo-router';
import { ProfileView } from '../../components/ProfileView';

/** Deep-linkable public profile: <scheme>://u/<username> */
export default function UserProfile() {
  const { username = '' } = useLocalSearchParams<{ username: string }>();
  return <ProfileView username={String(username)} />;
}

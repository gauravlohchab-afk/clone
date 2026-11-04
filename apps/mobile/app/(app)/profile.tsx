import { ProfileView } from '../../components/ProfileView';
import { useAuth } from '../../stores/auth';

export default function MyProfile() {
  const username = useAuth((s) => s.user?.username);
  return username ? <ProfileView username={username} /> : null;
}

import { Redirect } from 'expo-router';
import { homeRouteFor, useAuth } from '../stores/auth';

export default function Index() {
  const user = useAuth((s) => s.user);
  return <Redirect href={user ? homeRouteFor(user) : '/welcome'} />;
}

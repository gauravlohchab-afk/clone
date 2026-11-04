import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth, homePathFor } from '../stores/auth';
import { FullPageSpinner } from './Spinner';

export function RequireAuth({ onboarded = true }: { onboarded?: boolean }) {
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'signed_out' || !user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (onboarded && (!user.onboardingCompleted || !user.username)) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

/** Auth pages bounce signed-in users to where they belong. */
export function GuestOnly() {
  const { status, user } = useAuth();
  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'signed_in' && user) return <Navigate to={homePathFor(user)} replace />;
  return <Outlet />;
}

import { useEffect } from 'react';
import { createBrowserRouter, Link, Navigate, Outlet, RouterProvider } from 'react-router';
import { Wordmark } from './components/Logo';
import { FullPageSpinner } from './components/Spinner';
import { useAuth } from './stores/auth';
import { applyTheme } from './stores/theme';
import { AppShell } from './components/AppShell';
import { GuestOnly, RequireAuth } from './components/Guards';
import { Landing } from './pages/Landing';
import { Signup } from './pages/Signup';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { VerifyEmail } from './pages/VerifyEmail';
import { Onboarding } from './pages/onboarding/Onboarding';
import { Profile } from './pages/Profile';
import { Legal } from './pages/Legal';
import { NotFound } from './pages/NotFound';
import { SettingsLayout } from './pages/settings/SettingsLayout';
import { EditProfile } from './pages/settings/EditProfile';
import { Privacy } from './pages/settings/Privacy';
import { Security } from './pages/settings/Security';
import { Preferences } from './pages/settings/Preferences';
import { Account } from './pages/settings/Account';
import { HiddenAccounts } from './pages/settings/HiddenAccounts';
import { Connections } from './pages/social/Connections';
import { FollowRequests } from './pages/social/FollowRequests';
import type { SettingsDto } from '@vyro/types';
import { api } from './lib/api';

export const router = createBrowserRouter([
  { path: '/legal/:doc', element: <Legal /> },
  { path: '/verify-email', element: <VerifyEmail /> },
  { path: '/reset-password', element: <ResetPassword /> },
  {
    element: <GuestOnly />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/signup', element: <Signup /> },
      { path: '/login', element: <Login /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
    ],
  },
  { element: <RequireAuth onboarded={false} />, children: [{ path: '/onboarding', element: <Onboarding /> }] },
  {
    element: <RequireAuth onboarded={false} />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: '/settings',
            element: <SettingsLayout />,
            children: [
              { index: true, element: <Navigate to="/settings/profile" replace /> },
              { path: 'profile', element: <EditProfile /> },
              { path: 'privacy', element: <Privacy /> },
              { path: 'security', element: <Security /> },
              { path: 'preferences', element: <Preferences /> },
              { path: 'account', element: <Account /> },
              { path: 'hidden', element: <HiddenAccounts /> },
            ],
          },
          { path: '/requests', element: <FollowRequests /> },
        ],
      },
    ],
  },
  {
    element: <AppShellOrPublic />,
    children: [
      { path: '/:username', element: <Profile /> },
      { path: '/:username/followers', element: <Connections kind="followers" /> },
      { path: '/:username/following', element: <Connections kind="following" /> },
    ],
  },
  { path: '*', element: <NotFound /> },
]);

/** Profiles are public: signed-in viewers see them inside the app shell, guests see them bare. */
function AppShellOrPublic() {
  const { status, user } = useAuth();
  if (status === 'signed_in' && user?.username) return <AppShell />;
  return <PublicFrame />;
}

function PublicFrame() {
  const status = useAuth((s) => s.status);
  if (status === 'loading') return <FullPageSpinner />;
  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-8">
        <Link to="/" aria-label="Home"><Wordmark /></Link>
        <div className="flex gap-2">
          <Link to="/login" className="inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold hover:bg-raised">Log in</Link>
          <Link to="/signup" className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-on-primary">Sign up</Link>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

export function App() {
  const bootstrap = useAuth((s) => s.bootstrap);
  const status = useAuth((s) => s.status);
  useEffect(() => { void bootstrap(); }, [bootstrap]);
  useEffect(() => {
    if (status !== 'signed_in') return;
    api.get<SettingsDto>('/api/v1/me/settings').then((s) => applyTheme(s.theme)).catch(() => undefined);
  }, [status]);
  return <RouterProvider router={router} />;
}

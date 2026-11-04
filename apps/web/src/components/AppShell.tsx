import { NavLink, Outlet } from 'react-router';
import { Settings, UserRound, LogOut } from 'lucide-react';
import { useAuth } from '../stores/auth';
import { Wordmark, Mark } from './Logo';
import { Avatar } from './Avatar';

/**
 * Signed-in shell: custom left rail on desktop, bottom bar on mobile.
 * Only destinations that exist are listed; feed, explore, reels and messages
 * join this list as their phases ship.
 */
export function AppShell() {
  const user = useAuth((s) => s.user)!;
  const signOut = useAuth((s) => s.signOut);
  const username = user.username ?? '';
  const items = [
    { to: `/${username}`, label: 'Profile', icon: UserRound },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 items-center gap-3 rounded-md px-3 text-[15px] transition ${isActive ? 'bg-raised font-semibold text-fg' : 'text-muted hover:bg-raised hover:text-fg'}`;

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[76px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-on-primary">Skip to content</a>
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line px-3 py-5 md:flex">
        <NavLink to={`/${username}`} className="mb-8 px-2" aria-label="Home">
          <span className="xl:hidden"><Mark size={30} /></span>
          <span className="hidden xl:inline"><Wordmark /></span>
        </NavLink>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === `/${username}`} className={linkCls}>
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className="hidden xl:inline">{label}</span>
              <span className="sr-only xl:hidden">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2 border-t border-line pt-4">
          <Avatar name={user.profile?.displayName || username} url={user.profile?.avatarUrl} size={36} />
          <div className="hidden min-w-0 flex-1 xl:block">
            <p className="truncate text-sm font-semibold">{user.profile?.displayName || username}</p>
            <p className="truncate text-xs text-muted">@{username}</p>
          </div>
          <button type="button" onClick={() => void signOut()} className="flex size-11 items-center justify-center rounded-md text-muted hover:bg-raised hover:text-fg" aria-label="Log out">
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>
      <main id="main" className="min-w-0 pb-20 md:pb-0">
        <Outlet />
      </main>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === `/${username}`} className={({ isActive }) => `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${isActive ? 'text-fg' : 'text-muted'}`}>
            <Icon className="size-6" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

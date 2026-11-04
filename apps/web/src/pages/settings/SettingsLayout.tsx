import { NavLink, Outlet } from 'react-router';

const sections = [
  { to: '/settings/profile', label: 'Edit profile' },
  { to: '/settings/privacy', label: 'Privacy' },
  { to: '/settings/security', label: 'Password and security' },
  { to: '/settings/preferences', label: 'Preferences' },
  { to: '/settings/account', label: 'Your account' },
];

export function SettingsLayout() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <nav aria-label="Settings" className="-mx-4 mt-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {sections.map((s) => (
            <NavLink key={s.to} to={s.to} className={({ isActive }) => `flex min-h-11 shrink-0 items-center rounded-md px-3 text-sm ${isActive ? 'bg-raised font-semibold' : 'text-muted hover:bg-raised hover:text-fg'}`}>
              {s.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="mt-6 max-w-xl lg:mt-0"><Outlet /></div>
    </div>
  );
}

export function SettingsSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line pb-8 pt-2 last:border-0 [&+&]:pt-8">
      <h2 className="text-lg font-bold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

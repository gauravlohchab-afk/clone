import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Wordmark } from './Logo';
import { brand } from '../lib/brand';

/** Split layout for auth screens: form column + a typographic brand panel on wide screens. */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <main className="flex flex-col px-4 py-6 sm:px-10">
        <Link to="/" className="self-start" aria-label="Home"><Wordmark /></Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-bold">{title}</h1>
          {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-sm text-muted">{footer}</div>}
        </div>
      </main>
      <aside className="relative hidden overflow-hidden bg-ink-900 lg:block" aria-hidden="true">
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 gap-px opacity-[0.07]">
          {Array.from({ length: 36 }, (_, i) => <div key={i} className="border border-paper-100" />)}
        </div>
        <div className="absolute -right-24 top-16 size-[28rem] rotate-12 rounded-[3rem] bg-violet-500" />
        <div className="absolute bottom-20 left-14 size-48 rounded-full bg-coral-500" />
        <div className="absolute bottom-0 left-0 right-0 p-14">
          <p className="max-w-md font-display text-6xl font-bold leading-[0.95] text-lime-500">{brand.tagline}</p>
        </div>
      </aside>
    </div>
  );
}

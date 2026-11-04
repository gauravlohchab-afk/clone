import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Camera, Users, Compass } from 'lucide-react';
import { Wordmark } from '../components/Logo';
import { brand } from '../lib/brand';

const pillars = [
  { icon: Camera, title: 'Create', body: 'Share photos, videos, stories and short reels with editing tools built in.', tone: 'bg-lime-500 text-ink-900' },
  { icon: Users, title: 'Connect', body: 'Follow the people and creators you care about, and talk in real time.', tone: 'bg-violet-500 text-paper-50' },
  { icon: Compass, title: 'Discover', body: 'Find new voices, trends and communities shaped around your interests.', tone: 'bg-coral-500 text-ink-900' },
];

export function Landing() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Wordmark />
        <nav className="flex items-center gap-2" aria-label="Account">
          <Link to="/login" className="inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold hover:bg-raised">Log in</Link>
          <Link to="/signup" className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-on-primary">Join {brand.name}</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.2fr_1fr] lg:pt-20">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
            <p className="mb-5 inline-block rounded-sm bg-raised px-2 py-1 font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted">Early access</p>
            <h1 className="font-display text-5xl font-bold leading-[0.95] sm:text-7xl">
              {brand.tagline.split('. ').map((line, i, arr) => (
                <span key={line} className={i === arr.length - 1 ? 'block text-link' : 'block'}>{line}{i < arr.length - 1 ? '.' : ''}</span>
              ))}
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted">
              A social space for making things, finding your people and following what moves you. Built for everyone, everywhere.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="inline-flex min-h-12 items-center rounded-md bg-primary px-6 font-semibold text-on-primary">Create your account</Link>
              <Link to="/login" className="inline-flex min-h-12 items-center rounded-md border border-line px-6 font-semibold hover:border-fg/40">I already have one</Link>
            </div>
          </motion.div>

          <div className="relative hidden aspect-square lg:block" aria-hidden="true">
            <div className="absolute inset-[8%] rotate-6 rounded-[2.5rem] bg-violet-500" />
            <div className="absolute inset-[18%] -rotate-3 rounded-[2rem] bg-ink-800 ring-1 ring-ink-600" />
            <div className="absolute bottom-[10%] right-[6%] size-28 rounded-full bg-coral-500" />
            <div className="absolute left-[14%] top-[12%] size-20 rounded-md bg-lime-500" />
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto grid max-w-6xl gap-px bg-line sm:grid-cols-3">
            {pillars.map(({ icon: Icon, title, body, tone }) => (
              <div key={title} className="bg-bg px-4 py-10 sm:px-8">
                <span className={`inline-flex size-11 items-center justify-center rounded-md ${tone}`}><Icon className="size-5" aria-hidden="true" /></span>
                <h2 className="mt-5 text-2xl font-bold">{title}</h2>
                <p className="mt-2 text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-sm text-muted sm:px-8">
          <span>© {new Date().getFullYear()} {brand.name}</span>
          <Link to="/legal/terms" className="hover:text-fg">Terms</Link>
          <Link to="/legal/privacy" className="hover:text-fg">Privacy</Link>
          <Link to="/legal/community-guidelines" className="hover:text-fg">Community guidelines</Link>
        </div>
      </footer>
    </div>
  );
}

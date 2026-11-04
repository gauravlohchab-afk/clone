import { Link, useParams } from 'react-router';
import { Wordmark } from '../components/Logo';
import { Alert } from '../components/Alert';
import { brand } from '../lib/brand';
import { NotFound } from './NotFound';

/**
 * Working drafts so links resolve and users can read our intent. These are
 * NOT legally reviewed and must be replaced by counsel-approved text before launch.
 */
const docs: Record<string, { title: string; sections: [string, string][] }> = {
  terms: {
    title: 'Terms of Service',
    sections: [
      ['Who can use the service', `You must be at least 13 years old (or older where local law requires) to create a ${brand.name} account.`],
      ['Your content', 'You keep ownership of what you post. You give us permission to host, display and distribute it so the service can work.'],
      ['Acceptable use', 'Follow the Community Guidelines. We may remove content or restrict accounts that break them, and we keep a record of every moderation decision.'],
      ['Ending your account', 'You can deactivate or delete your account at any time from Settings. Deletion is final after a 30-day grace period.'],
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    sections: [
      ['What we collect', 'Account details you give us (email, date of birth, profile), content you post, and technical data needed to keep your account secure (sessions, sign-in activity).'],
      ['How we use it', 'To run and secure the service, personalise what you see, and comply with the law. We do not sell personal data.'],
      ['Your controls', 'Download your data, change privacy settings, review and end sessions, and delete your account from Settings.'],
      ['Retention', 'Sign-in activity is kept for 180 days. Deleted accounts are permanently removed after the 30-day grace period, except where law requires us to keep records.'],
    ],
  },
  'community-guidelines': {
    title: 'Community Guidelines',
    sections: [
      ['Be real', 'Do not impersonate people or organisations, or run fake accounts.'],
      ['Be safe', 'No harassment, hate, threats, sexual content involving minors, or content that promotes self-harm.'],
      ['Respect rights', 'Only post content you have the right to share. Rights holders can file a copyright complaint.'],
      ['Reporting', 'Report anything that breaks these rules. Reports are reviewed by people, and you can appeal decisions.'],
    ],
  },
};

export function Legal() {
  const { doc = '' } = useParams();
  const page = docs[doc];
  if (!page) return <NotFound />;
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8">
      <Link to="/" aria-label="Home"><Wordmark /></Link>
      <h1 className="mt-10 text-4xl font-bold">{page.title}</h1>
      <div className="mt-6"><Alert>Draft for review. This text has not yet been approved by legal counsel and will change before public launch.</Alert></div>
      {page.sections.map(([h, b]) => (
        <section key={h} className="mt-8">
          <h2 className="text-xl font-bold">{h}</h2>
          <p className="mt-2 leading-relaxed text-muted">{b}</p>
        </section>
      ))}
    </div>
  );
}

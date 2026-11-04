import { useState } from 'react';
import { Ban, EyeOff, MoreHorizontal, ShieldMinus, UserMinus } from 'lucide-react';
import type { RelationshipDto } from '@vyro/types';
import { Dialog } from '../Dialog';
import { Button } from '../Button';
import { Toggle } from '../Controls';
import { Alert } from '../Alert';
import { social } from '../../lib/social';
import { errorMessage } from '../../lib/form-errors';

type View = 'menu' | 'block' | 'mute';

/** The "…" menu on someone else's profile: remove follower, restrict, mute, block. */
export function ProfileActions({ username, relationship, onChange }: { username: string; relationship: RelationshipDto; onChange: (r: RelationshipDto) => void }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('menu');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mute, setMute] = useState(relationship.muting ?? { posts: true, stories: true });
  const r = relationship;

  const close = () => { setOpen(false); setView('menu'); setError(null); };
  async function run(fn: () => Promise<RelationshipDto | unknown>, after?: (r: RelationshipDto) => RelationshipDto) {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      const next = res && typeof res === 'object' && 'blocking' in res ? (res as RelationshipDto) : r;
      onChange(after ? after(next) : next);
      close();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  const item = 'flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium hover:bg-raised disabled:opacity-50';
  const title = view === 'block' ? (r.blocking ? `Unblock @${username}?` : `Block @${username}?`) : view === 'mute' ? `Mute @${username}` : `@${username}`;

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} aria-label={`More options for @${username}`} className="px-3"><MoreHorizontal className="size-4" aria-hidden="true" /></Button>
      <Dialog open={open} onClose={close} title={title}>
        {error && <div className="mb-3"><Alert tone="error">{error}</Alert></div>}
        {view === 'menu' && (
          <ul className="-mx-2 space-y-0.5">
            {r.followedBy && !r.blocking && (
              <li><button type="button" className={item} disabled={busy} onClick={() => run(() => social.removeFollower(username), (x) => ({ ...x, followedBy: false }))}>
                <UserMinus className="size-4" aria-hidden="true" />Remove follower
              </button></li>
            )}
            {!r.blocking && (
              <li><button type="button" className={item} disabled={busy} onClick={() => run(() => (r.restricting ? social.unrestrict(username) : social.restrict(username)))}>
                <ShieldMinus className="size-4" aria-hidden="true" />
                <span>{r.restricting ? 'Unrestrict' : 'Restrict'}<span className="block text-xs font-normal text-muted">{r.restricting ? 'Their interactions will be visible to everyone again.' : "Limit their interactions without them knowing."}</span></span>
              </button></li>
            )}
            {!r.blocking && (
              <li><button type="button" className={item} disabled={busy} onClick={() => (r.muting ? run(() => social.unmute(username)) : setView('mute'))}>
                <EyeOff className="size-4" aria-hidden="true" />
                <span>{r.muting ? 'Unmute' : 'Mute'}<span className="block text-xs font-normal text-muted">{r.muting ? 'Show their posts and stories again.' : "Hide their posts or stories. They won't be told."}</span></span>
              </button></li>
            )}
            <li><button type="button" className={`${item} text-danger`} disabled={busy} onClick={() => setView('block')}>
              <Ban className="size-4" aria-hidden="true" />{r.blocking ? 'Unblock' : 'Block'}
            </button></li>
          </ul>
        )}
        {view === 'mute' && (
          <div>
            <Toggle label="Mute posts" checked={mute.posts} onChange={(posts) => setMute((m) => ({ ...m, posts }))} />
            <Toggle label="Mute stories" checked={mute.stories} onChange={(stories) => setMute((m) => ({ ...m, stories }))} />
            <p className="mt-2 text-xs text-muted">You'll still follow them, and they won't know you muted them.</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setView('menu')}>Back</Button>
              <Button loading={busy} disabled={!mute.posts && !mute.stories} onClick={() => run(() => social.mute(username, mute))}>Mute</Button>
            </div>
          </div>
        )}
        {view === 'block' && (
          <div>
            <p className="text-sm text-muted">
              {r.blocking
                ? "They'll be able to see your profile and follow you again. They won't be told you unblocked them."
                : "They won't be able to find your profile or see what you share, and you'll stop following each other. They won't be told you blocked them."}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setView('menu')}>Back</Button>
              <Button variant={r.blocking ? 'primary' : 'danger'} loading={busy} onClick={() => run(() => (r.blocking ? social.unblock(username) : social.block(username)))}>
                {r.blocking ? 'Unblock' : 'Block'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

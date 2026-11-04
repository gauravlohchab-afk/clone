import { useCallback, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { ProfileSummaryDto } from '@vyro/types';
import { social, type ConnectionKind } from '../../lib/social';
import { useAuth } from '../../stores/auth';
import { ProfileRow } from '../../components/social/ProfileRow';
import { FollowButton } from '../../components/social/FollowButton';
import { useCursorList } from '../../components/social/useCursorList';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { errorMessage } from '../../lib/form-errors';

/** /:username/followers and /:username/following. */
export function Connections({ kind }: { kind: ConnectionKind }) {
  const { username = '' } = useParams();
  const me = useAuth((s) => s.user);
  const own = me?.username === username.toLowerCase();
  const load = useCallback((c?: string | null) => social.connections(username, kind, c), [username, kind]);
  const list = useCursorList<ProfileSummaryDto>(load, `${username}:${kind}`);
  const [removing, setRemoving] = useState<ProfileSummaryDto | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tab = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 flex-1 items-center justify-center border-b-2 text-sm font-semibold ${isActive ? 'border-fg text-fg' : 'border-transparent text-muted hover:text-fg'}`;

  async function confirmRemove() {
    if (!removing) return;
    setBusy(true);
    setRemoveError(null);
    try {
      await social.removeFollower(removing.username);
      list.setItems((xs) => xs.filter((x) => x.userId !== removing.userId));
      setRemoving(null);
    } catch (e) { setRemoveError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  const forbidden = list.error && /private/i.test(list.error);

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:px-8">
      <div className="flex items-center gap-2">
        <Link to={`/${username}`} aria-label={`Back to @${username}`} className="flex size-11 items-center justify-center rounded-md hover:bg-raised"><ArrowLeft className="size-5" /></Link>
        <h1 className="text-xl font-bold">@{username}</h1>
      </div>
      <nav aria-label="Connections" className="mt-4 flex border-b border-line">
        <NavLink to={`/${username}/followers`} className={tab}>Followers</NavLink>
        <NavLink to={`/${username}/following`} className={tab}>Following</NavLink>
      </nav>

      {list.loading && <div className="flex justify-center py-12" role="status"><Loader2 className="size-6 animate-spin text-muted" aria-hidden="true" /><span className="sr-only">Loading</span></div>}
      {list.error && <div className="mt-6"><Alert tone={forbidden ? 'info' : 'error'}>{list.error}</Alert></div>}
      {!list.loading && !list.error && list.items.length === 0 && (
        <p className="py-12 text-center text-sm text-muted">
          {kind === 'followers' ? (own ? 'When people follow you, they’ll appear here.' : 'No followers yet.') : own ? 'Accounts you follow will appear here.' : 'Not following anyone yet.'}
        </p>
      )}
      <ul className="mt-2 divide-y divide-line/60">
        {list.items.map((p) => (
          <ProfileRow key={p.userId} profile={p} action={
            own && kind === 'followers' ? (
              <Button variant="secondary" className="min-h-9 px-4" onClick={() => setRemoving(p)}>Remove</Button>
            ) : me && p.relationship && !p.relationship.isSelf ? (
              <FollowButton compact username={p.username} isPrivate={p.isPrivate} state={p.relationship} />
            ) : null
          } />
        ))}
      </ul>
      {list.hasMore && <div className="mt-4 flex justify-center"><Button variant="secondary" loading={list.loadingMore} onClick={() => void list.loadMore()}>Load more</Button></div>}

      <Dialog open={!!removing} onClose={() => setRemoving(null)} title="Remove follower?">
        {removeError && <div className="mb-3"><Alert tone="error">{removeError}</Alert></div>}
        <p className="text-sm text-muted">VYRO won't tell @{removing?.username} they were removed from your followers.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(null)}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={confirmRemove}>Remove</Button>
        </div>
      </Dialog>
    </div>
  );
}


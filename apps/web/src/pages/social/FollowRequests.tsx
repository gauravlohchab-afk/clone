import { useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { FollowRequestDto } from '@vyro/types';
import { social } from '../../lib/social';
import { ProfileRow } from '../../components/social/ProfileRow';
import { useCursorList } from '../../components/social/useCursorList';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { errorMessage } from '../../lib/form-errors';

/** /requests: people asking to follow the signed-in (private) account. */
export function FollowRequests() {
  const load = useCallback((c?: string | null) => social.requests(c), []);
  const list = useCursorList<FollowRequestDto>(load, 'requests');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(req: FollowRequestDto, approve: boolean) {
    setBusy(req.id);
    setError(null);
    try {
      await (approve ? social.approve(req.id) : social.decline(req.id));
      list.setItems((xs) => xs.filter((x) => x.id !== req.id));
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(null); }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold">Follow requests</h1>
      <p className="mt-1 text-sm text-muted">Only people you approve can see your posts while your account is private.</p>
      {(error || list.error) && <div className="mt-6"><Alert tone="error">{error || list.error}</Alert></div>}
      {list.loading && <div className="flex justify-center py-12" role="status"><Loader2 className="size-6 animate-spin text-muted" aria-hidden="true" /><span className="sr-only">Loading</span></div>}
      {!list.loading && !list.error && list.items.length === 0 && <p className="py-12 text-center text-sm text-muted">No pending requests.</p>}
      <ul className="mt-4 divide-y divide-line/60">
        {list.items.map((r) => (
          <ProfileRow key={r.id} profile={r.from} action={
            <div className="flex gap-2">
              <Button className="min-h-9 px-4" loading={busy === r.id} disabled={!!busy} onClick={() => act(r, true)} aria-label={`Confirm @${r.from.username}`}>Confirm</Button>
              <Button variant="secondary" className="min-h-9 px-4" disabled={!!busy} onClick={() => act(r, false)} aria-label={`Delete request from @${r.from.username}`}>Delete</Button>
            </div>
          } />
        ))}
      </ul>
      {list.hasMore && <div className="mt-4 flex justify-center"><Button variant="secondary" loading={list.loadingMore} onClick={() => void list.loadMore()}>Load more</Button></div>}
    </div>
  );
}

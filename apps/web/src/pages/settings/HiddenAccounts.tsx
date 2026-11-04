import { useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { MutedAccountDto, ProfileSummaryDto } from '@vyro/types';
import { social } from '../../lib/social';
import { ProfileRow } from '../../components/social/ProfileRow';
import { useCursorList } from '../../components/social/useCursorList';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { errorMessage } from '../../lib/form-errors';

type Kind = 'blocked' | 'restricted' | 'muted';
const tabs: { kind: Kind; label: string; empty: string; undo: string }[] = [
  { kind: 'blocked', label: 'Blocked', empty: "You haven't blocked anyone.", undo: 'Unblock' },
  { kind: 'restricted', label: 'Restricted', empty: "You haven't restricted anyone.", undo: 'Unrestrict' },
  { kind: 'muted', label: 'Muted', empty: "You haven't muted anyone.", undo: 'Unmute' },
];

const mutedWhat = (m: MutedAccountDto['muting']) => (m.posts && m.stories ? 'Posts and stories muted' : m.posts ? 'Posts muted' : 'Stories muted');

/** /settings/hidden: blocked, restricted and muted accounts, each undoable. */
export function HiddenAccounts() {
  const [kind, setKind] = useState<Kind>('blocked');
  const tab = tabs.find((t) => t.kind === kind)!;
  const load = useCallback((c?: string | null) => social.safetyList(kind, c), [kind]);
  const list = useCursorList<ProfileSummaryDto | MutedAccountDto>(load, kind);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function undo(p: ProfileSummaryDto) {
    setBusy(p.userId);
    setError(null);
    try {
      await (kind === 'blocked' ? social.unblock(p.username) : kind === 'restricted' ? social.unrestrict(p.username) : social.unmute(p.username));
      list.setItems((xs) => xs.filter((x) => x.userId !== p.userId));
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(null); }
  }

  return (
    <div>
      <h2 className="text-lg font-bold">Blocked, restricted and muted</h2>
      <p className="mt-1 text-sm text-muted">People aren't told when you block, restrict or mute them, or when you undo it.</p>
      <div role="tablist" aria-label="Account lists" className="mt-5 flex border-b border-line">
        {tabs.map((t) => (
          <button key={t.kind} role="tab" type="button" aria-selected={t.kind === kind} onClick={() => setKind(t.kind)}
            className={`min-h-11 flex-1 border-b-2 text-sm font-semibold ${t.kind === kind ? 'border-fg text-fg' : 'border-transparent text-muted hover:text-fg'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={tab.label}>
        {(error || list.error) && <div className="mt-4"><Alert tone="error">{error || list.error}</Alert></div>}
        {list.loading && <div className="flex justify-center py-10" role="status"><Loader2 className="size-6 animate-spin text-muted" aria-hidden="true" /><span className="sr-only">Loading</span></div>}
        {!list.loading && !list.error && list.items.length === 0 && <p className="py-10 text-center text-sm text-muted">{tab.empty}</p>}
        <ul className="mt-2 divide-y divide-line/60">
          {list.items.map((p) => (
            <ProfileRow key={p.userId} profile={p} sub={'muting' in p ? mutedWhat(p.muting) : undefined}
              action={<Button variant="secondary" className="min-h-9 px-4" loading={busy === p.userId} disabled={!!busy} onClick={() => undo(p)}>{tab.undo}</Button>} />
          ))}
        </ul>
        {list.hasMore && <div className="mt-4 flex justify-center"><Button variant="secondary" loading={list.loadingMore} onClick={() => void list.loadMore()}>Load more</Button></div>}
      </div>
    </div>
  );
}

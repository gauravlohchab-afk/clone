import { useEffect, useState } from 'react';
import type { FollowResultDto } from '@vyro/types';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import { followLabel, social } from '../../lib/social';
import { errorMessage } from '../../lib/form-errors';

interface Props {
  username: string;
  isPrivate: boolean;
  state: { following: boolean; requested: boolean; followedBy?: boolean };
  onChange?: (r: FollowResultDto) => void;
  compact?: boolean;
}

/**
 * Follow / Following / Requested. Unfollowing a private account asks first,
 * because getting back in needs a new approval.
 */
export function FollowButton({ username, isPrivate, state, onChange, compact }: Props) {
  const [local, setLocal] = useState(state);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = local;
  useEffect(() => setLocal(state), [state.following, state.requested, state.followedBy]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(fn: () => Promise<FollowResultDto>) {
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      setLocal({ following: r.relationship.following, requested: r.relationship.requested, followedBy: r.relationship.followedBy });
      onChange?.(r);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); setConfirm(false); }
  }

  const active = current.following || current.requested;
  const click = () => {
    if (!active) return run(() => social.follow(username));
    if (current.following && isPrivate) return setConfirm(true);
    return run(() => social.unfollow(username));
  };

  return (
    <>
      <Button variant={active ? 'secondary' : 'primary'} loading={busy} onClick={click} className={compact ? 'min-h-9 px-4' : ''}
        aria-label={active ? `${followLabel(current)} @${username}. ${current.requested ? 'Cancel request' : 'Unfollow'}` : `Follow @${username}`}>
        {followLabel(current)}
      </Button>
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
      <Dialog open={confirm} onClose={() => setConfirm(false)} title={`Unfollow @${username}?`}>
        <p className="text-sm text-muted">This account is private. To see their posts again you'll need to send a new follow request.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={() => run(() => social.unfollow(username))}>Unfollow</Button>
        </div>
      </Dialog>
    </>
  );
}

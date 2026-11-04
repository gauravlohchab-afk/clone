import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { BadgeCheck } from 'lucide-react';
import type { ProfileSummaryDto } from '@vyro/types';
import { Avatar } from '../Avatar';

/** One account in a list: avatar, handle and name, with an action on the right. */
export function ProfileRow({ profile, action, sub }: { profile: ProfileSummaryDto; action?: ReactNode; sub?: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Link to={`/${profile.username}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-md">
        <Avatar name={profile.displayName || profile.username} url={profile.avatarUrl} size={44} />
        <span className="min-w-0">
          <span className="flex items-center gap-1">
            <span className="truncate text-sm font-semibold">{profile.username}</span>
            {profile.isVerified && <BadgeCheck className="size-3.5 shrink-0 text-secondary" aria-label="Verified account" />}
          </span>
          <span className="block truncate text-sm text-muted">{sub ?? profile.displayName}</span>
        </span>
      </Link>
      {action && <div className="shrink-0">{action}</div>}
    </li>
  );
}

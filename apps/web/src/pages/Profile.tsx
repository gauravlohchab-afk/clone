import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Globe, Lock, MapPin, Share2, BadgeCheck } from 'lucide-react';
import type { ProfileSummaryDto, PublicProfileDto, RelationshipDto } from '@vyro/types';
import { formatCount } from '@vyro/shared';
import { ApiError } from '@vyro/shared';
import { api } from '../lib/api';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { FullPageSpinner } from '../components/Spinner';
import { NotFound } from './NotFound';
import { errorMessage } from '../lib/form-errors';
import { social } from '../lib/social';
import { useAuth } from '../stores/auth';
import { FollowButton } from '../components/social/FollowButton';
import { ProfileActions } from '../components/social/ProfileActions';

export function Profile() {
  const { username = '' } = useParams();
  const [profile, setProfile] = useState<PublicProfileDto | null>(null);
  const [error, setError] = useState<{ notFound: boolean; message: string } | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [mutuals, setMutuals] = useState<{ items: ProfileSummaryDto[]; total: number } | null>(null);
  const signedIn = useAuth((s) => s.status === 'signed_in');

  useEffect(() => {
    let live = true;
    setProfile(null);
    setError(null);
    api.get<PublicProfileDto>(`/api/v1/users/${encodeURIComponent(username)}`)
      .then((p) => live && setProfile(p))
      .catch((e) => live && setError({ notFound: e instanceof ApiError && e.status === 404, message: errorMessage(e) }));
    return () => { live = false; };
  }, [username]);

  const rel = profile?.viewer.relationship ?? null;
  useEffect(() => {
    setMutuals(null);
    if (!signedIn || !profile || !rel || rel.isSelf || rel.blocking) return;
    let live = true;
    social.mutuals(profile.username, 3).then((m) => live && setMutuals(m)).catch(() => undefined);
    return () => { live = false; };
  }, [signedIn, profile?.username, rel?.isSelf, rel?.blocking]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Re-fetch after a relationship change so counts and content visibility come from the server. */
  async function refresh() {
    try { setProfile(await api.get<PublicProfileDto>(`/api/v1/users/${encodeURIComponent(username)}`)); }
    catch (e) { setError({ notFound: e instanceof ApiError && e.status === 404, message: errorMessage(e) }); }
  }
  const setRelationship = (r: RelationshipDto) => {
    setProfile((p) => (p ? { ...p, viewer: { ...p.viewer, relationship: r } } : p));
    void refresh();
  };

  if (error?.notFound) return <NotFound message="This account doesn't exist or isn't available." />;
  if (error) return <div className="p-6"><Alert tone="error">{error.message}</Alert></div>;
  if (!profile) return <FullPageSpinner label="Loading profile" />;

  async function share() {
    const url = `${window.location.origin}/${profile!.username}`;
    try {
      if (navigator.share) await navigator.share({ title: `@${profile!.username}`, url });
      else { await navigator.clipboard.writeText(url); setShareNote('Profile link copied'); setTimeout(() => setShareNote(null), 2500); }
    } catch { /* user dismissed the share sheet */ }
  }

  const stats = [
    { label: 'posts', value: profile.counts.posts, to: null },
    { label: 'followers', value: profile.counts.followers, to: `/${profile.username}/followers` },
    { label: 'following', value: profile.counts.following, to: `/${profile.username}/following` },
  ];
  const canOpenLists = profile.viewer.canViewContent;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <Avatar name={profile.displayName || profile.username} url={profile.avatarUrl} size={112} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold">{profile.username}</h1>
            {profile.isVerified && <BadgeCheck className="size-5 text-secondary" aria-label="Verified account" />}
            {profile.isPrivate && <Lock className="size-4 text-muted" aria-label="Private account" />}
            {rel?.followedBy && !rel.isSelf && <span className="rounded-sm bg-raised px-2 py-0.5 text-xs font-semibold text-muted">Follows you</span>}
            {profile.accountType !== 'personal' && (
              <span className="rounded-sm bg-raised px-2 py-0.5 text-xs font-semibold capitalize text-muted">{profile.category || profile.accountType}</span>
            )}
          </div>
          <dl className="mt-4 flex gap-6">
            {stats.map((s) => {
              const body = (
                <>
                  <dd className="font-display text-lg font-bold">{formatCount(s.value)}</dd>
                  <span className="text-sm text-muted" aria-hidden="true">{s.label}</span>
                </>
              );
              return (
                <div key={s.label} className="flex items-baseline gap-1.5">
                  <dt className="sr-only">{s.label}</dt>
                  {s.to && canOpenLists ? <Link to={s.to} className="flex items-baseline gap-1.5 rounded hover:opacity-80">{body}</Link> : body}
                </div>
              );
            })}
          </dl>
          {profile.displayName && <p className="mt-4 font-semibold">{profile.displayName}</p>}
          {profile.bio && <p className="mt-1 whitespace-pre-line">{profile.bio}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {profile.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden="true" />{profile.location}</span>}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex items-center gap-1 font-medium text-link">
                <Globe className="size-3.5" aria-hidden="true" />{profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
          {mutuals && mutuals.total > 0 && (
            <p className="mt-3 text-sm text-muted">
              Followed by {mutuals.items.map((m, i) => (
                <span key={m.userId}>{i > 0 && (i === mutuals.items.length - 1 && mutuals.total <= mutuals.items.length ? ' and ' : ', ')}<Link to={`/${m.username}`} className="font-semibold text-fg">{m.username}</Link></span>
              ))}
              {mutuals.total > mutuals.items.length && ` and ${formatCount(mutuals.total - mutuals.items.length)} ${mutuals.total - mutuals.items.length === 1 ? 'other' : 'others'}`}
            </p>
          )}
          <div className="mt-5 flex gap-2">
            {profile.viewer.isSelf && <Link to="/settings/profile" className="inline-flex min-h-11 items-center rounded-md border border-line bg-raised px-5 text-sm font-semibold hover:border-fg/40">Edit profile</Link>}
            {rel && !rel.isSelf && !rel.blocking && (
              <FollowButton username={profile.username} isPrivate={profile.isPrivate} state={rel} onChange={(r) => setRelationship(r.relationship)} />
            )}
            {!signedIn && <Link to="/signup" className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-on-primary">Follow</Link>}
            <Button variant="secondary" onClick={share} aria-label="Share profile"><Share2 className="size-4" aria-hidden="true" />Share</Button>
            {rel && !rel.isSelf && <ProfileActions username={profile.username} relationship={rel} onChange={setRelationship} />}
          </div>
          {shareNote && <p role="status" className="mt-2 text-sm text-muted">{shareNote}</p>}
        </div>
      </header>

      <section className="mt-10 border-t border-line pt-10" aria-label="Posts">
        {rel?.blocking ? (
          <div className="py-12 text-center">
            <p className="font-display text-xl font-bold">You blocked @{profile.username}</p>
            <p className="mt-1 text-sm text-muted">Unblock them from the ••• menu to see their posts and follow each other again.</p>
          </div>
        ) : profile.viewer.canViewContent ? (
          <div className="py-12 text-center">
            <p className="font-display text-xl font-bold">No posts yet</p>
            <p className="mt-1 text-sm text-muted">{profile.viewer.isSelf ? 'When you share photos and videos, they will appear here.' : 'Posts will appear here once they share something.'}</p>
          </div>
        ) : (
          <div className="py-12 text-center">
            <Lock className="mx-auto size-8 text-muted" aria-hidden="true" />
            <p className="mt-3 font-display text-xl font-bold">This account is private</p>
            <p className="mt-1 text-sm text-muted">{rel?.requested ? 'Your follow request is pending. You’ll see their posts once they approve it.' : 'Follow this account to see their photos and videos.'}</p>
          </div>
        )}
      </section>
    </div>
  );
}

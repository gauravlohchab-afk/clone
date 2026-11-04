import { Types } from 'mongoose';
import type { ProfileSummaryDto, RelationshipDto } from '@vyro/types';
import { notFound } from '../../lib/errors.js';
import { Profile } from '../profiles/profile.model.js';
import { Follow } from '../follows/follow.model.js';
import { FollowRequest } from '../follows/follow-request.model.js';
import { Block, Mute, Restriction } from './relationship.models.js';

const oid = (id: string | Types.ObjectId) => (typeof id === 'string' ? new Types.ObjectId(id) : id);

export async function isBlockedEitherWay(a: string | Types.ObjectId, b: string | Types.ObjectId) {
  return !!(await Block.exists({ $or: [{ userId: oid(a), targetId: oid(b) }, { userId: oid(b), targetId: oid(a) }] }));
}

/** Ids of accounts the viewer must never see: those they block and those blocking them. */
export async function hiddenUserIds(viewerId: string | Types.ObjectId): Promise<Types.ObjectId[]> {
  const v = oid(viewerId);
  const rows = await Block.find({ $or: [{ userId: v }, { targetId: v }] }, { userId: 1, targetId: 1 }).lean();
  return rows.map((r) => (r.userId.equals(v) ? r.targetId : r.userId));
}

export async function getRelationship(viewerId: string, targetUserId: string | Types.ObjectId): Promise<RelationshipDto> {
  const v = oid(viewerId);
  const t = oid(targetUserId);
  if (v.equals(t)) {
    return { isSelf: true, following: false, requested: false, followedBy: false, blocking: false, restricting: false, muting: null };
  }
  const [following, requested, followedBy, blocking, restricting, mute] = await Promise.all([
    Follow.exists({ followerId: v, followeeId: t }),
    FollowRequest.exists({ requesterId: v, targetId: t }),
    Follow.exists({ followerId: t, followeeId: v }),
    Block.exists({ userId: v, targetId: t }),
    Restriction.exists({ userId: v, targetId: t }),
    Mute.findOne({ userId: v, targetId: t }, { posts: 1, stories: 1 }).lean(),
  ]);
  return {
    isSelf: false,
    following: !!following,
    requested: !!requested,
    followedBy: !!followedBy,
    blocking: !!blocking,
    restricting: !!restricting,
    muting: mute ? { posts: mute.posts, stories: mute.stories } : null,
  };
}

/**
 * Resolves a username to its visible profile for this viewer. A target that
 * blocks the viewer is reported as not found, so blocking cannot be detected.
 */
export async function resolveVisibleProfile(username: string, viewerId?: string) {
  const profile = await Profile.findOne({ username: username.toLowerCase(), visible: true }).lean();
  if (!profile) throw notFound('This account does not exist or is unavailable');
  if (viewerId && !profile.userId.equals(viewerId)) {
    if (await Block.exists({ userId: profile.userId, targetId: oid(viewerId) })) {
      throw notFound('This account does not exist or is unavailable');
    }
  }
  return profile;
}

/** Viewer may see a profile's posts, followers and following. */
export function canViewContent(profile: { isPrivate: boolean; userId: Types.ObjectId }, rel: RelationshipDto | null) {
  if (rel?.isSelf) return true;
  if (rel?.blocking) return false;
  return !profile.isPrivate || !!rel?.following;
}

type SummarySource = { userId: Types.ObjectId; username: string; displayName: string; avatar?: { url?: string | null } | null; isVerified: boolean; isPrivate: boolean };

/** Builds summaries for many profiles with one batched relationship lookup (no N+1). */
export async function toSummaries(profiles: SummarySource[], viewerId?: string): Promise<ProfileSummaryDto[]> {
  let following = new Set<string>();
  let requested = new Set<string>();
  if (viewerId && profiles.length) {
    const ids = profiles.map((p) => p.userId);
    const v = oid(viewerId);
    const [f, r] = await Promise.all([
      Follow.find({ followerId: v, followeeId: { $in: ids } }, { followeeId: 1 }).lean(),
      FollowRequest.find({ requesterId: v, targetId: { $in: ids } }, { targetId: 1 }).lean(),
    ]);
    following = new Set(f.map((x) => String(x.followeeId)));
    requested = new Set(r.map((x) => String(x.targetId)));
  }
  return profiles.map((p) => ({
    userId: String(p.userId),
    username: p.username,
    displayName: p.displayName,
    avatarUrl: p.avatar?.url ?? null,
    isVerified: p.isVerified,
    isPrivate: p.isPrivate,
    ...(viewerId
      ? { relationship: { isSelf: String(p.userId) === viewerId, following: following.has(String(p.userId)), requested: requested.has(String(p.userId)) } }
      : {}),
  }));
}

/** Loads profiles for user ids, preserving the order of `ids` and skipping hidden ones. */
export async function profilesInOrder(ids: Types.ObjectId[]) {
  const docs = await Profile.find({ userId: { $in: ids }, visible: true }).lean();
  const byId = new Map(docs.map((d) => [String(d.userId), d]));
  return ids.map((id) => byId.get(String(id))).filter((d): d is NonNullable<typeof d> => !!d);
}

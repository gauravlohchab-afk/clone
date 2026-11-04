import mongoose, { Types } from 'mongoose';
import type { MutedAccountDto, Page, ProfileSummaryDto } from '@vyro/types';
import { badRequest, notFound } from '../../lib/errors.js';
import { cursorFilter, encodeCursor } from '../../lib/cursor.js';
import { Profile } from '../profiles/profile.model.js';
import { FollowRequest } from '../follows/follow-request.model.js';
import { removeFollowEdge } from '../follows/follows.service.js';
import { Block, Mute, Restriction } from './relationship.models.js';
import { getRelationship, profilesInOrder, toSummaries } from './relationships.service.js';

const oid = (id: string) => new Types.ObjectId(id);

/** Targets for safety actions are found even if they block the viewer, so you can always block back. */
async function target(viewerId: string, username: string) {
  const p = await Profile.findOne({ username: username.toLowerCase() }, { userId: 1 }).lean();
  if (!p) throw notFound('This account does not exist or is unavailable');
  if (p.userId.equals(viewerId)) throw badRequest('You cannot do that to your own account');
  return p.userId;
}

export async function block(viewerId: string, username: string) {
  const t = await target(viewerId, username);
  const v = oid(viewerId);
  await mongoose.connection.transaction(async (s) => {
    await Block.updateOne({ userId: v, targetId: t }, { $setOnInsert: { createdAt: new Date() } }, { upsert: true, session: s });
    await removeFollowEdge(v, t, s);
    await removeFollowEdge(t, v, s);
    await FollowRequest.deleteMany({ $or: [{ requesterId: v, targetId: t }, { requesterId: t, targetId: v }] }, { session: s });
  });
  return getRelationship(viewerId, t);
}

export async function unblock(viewerId: string, username: string) {
  const t = await target(viewerId, username);
  await Block.deleteOne({ userId: oid(viewerId), targetId: t });
  return getRelationship(viewerId, t);
}

export async function restrict(viewerId: string, username: string) {
  const t = await target(viewerId, username);
  await Restriction.updateOne({ userId: oid(viewerId), targetId: t }, { $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  return getRelationship(viewerId, t);
}

export async function unrestrict(viewerId: string, username: string) {
  const t = await target(viewerId, username);
  await Restriction.deleteOne({ userId: oid(viewerId), targetId: t });
  return getRelationship(viewerId, t);
}

export async function mute(viewerId: string, username: string, opts: { posts: boolean; stories: boolean }) {
  const t = await target(viewerId, username);
  await Mute.updateOne({ userId: oid(viewerId), targetId: t }, { $set: opts }, { upsert: true });
  return getRelationship(viewerId, t);
}

export async function unmute(viewerId: string, username: string) {
  const t = await target(viewerId, username);
  await Mute.deleteOne({ userId: oid(viewerId), targetId: t });
  return getRelationship(viewerId, t);
}

type Kind = 'blocked' | 'restricted' | 'muted';
const models = { blocked: Block, restricted: Restriction, muted: Mute } as const;

/** The viewer's own block / restrict / mute lists, for settings. */
export async function listSafety(viewerId: string, kind: Kind, limit: number, cursor?: string): Promise<Page<ProfileSummaryDto | MutedAccountDto>> {
  const Model = models[kind] as typeof Mute;
  const rows = await Model.find({ userId: oid(viewerId), ...cursorFilter(cursor) }).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean();
  const page = rows.slice(0, limit);
  // Blocked accounts are listed even when hidden elsewhere so they can be unblocked.
  const profiles = kind === 'blocked'
    ? await Profile.find({ userId: { $in: page.map((r) => r.targetId) } }).lean().then((d) => {
        const m = new Map(d.map((x) => [String(x.userId), x]));
        return page.map((r) => m.get(String(r.targetId))).filter((x): x is NonNullable<typeof x> => !!x);
      })
    : await profilesInOrder(page.map((r) => r.targetId));
  const summaries = await toSummaries(profiles);
  const items = kind === 'muted'
    ? summaries.map((s) => {
        const row = page.find((r) => String(r.targetId) === s.userId)!;
        return { ...s, muting: { posts: row.posts, stories: row.stories } };
      })
    : summaries;
  return { items, nextCursor: rows.length > limit && page.length ? encodeCursor(page[page.length - 1]!) : null };
}

import mongoose, { Types, type ClientSession } from 'mongoose';
import type { FollowRequestDto, FollowResultDto, Page, ProfileSummaryDto } from '@vyro/types';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { cursorFilter, encodeCursor } from '../../lib/cursor.js';
import { Profile } from '../profiles/profile.model.js';
import { Follow } from './follow.model.js';
import { FollowRequest } from './follow-request.model.js';
import {
  canViewContent, getRelationship, hiddenUserIds, isBlockedEitherWay, profilesInOrder, resolveVisibleProfile, toSummaries,
} from '../relationships/relationships.service.js';

const oid = (id: string | Types.ObjectId) => (typeof id === 'string' ? new Types.ObjectId(id) : id);

async function requireOwnProfile(userId: string) {
  const me = await Profile.findOne({ userId }, { _id: 1, userId: 1 }).lean();
  if (!me) throw conflict('Choose a username first');
  return me;
}

async function counts(userId: Types.ObjectId) {
  const p = await Profile.findOne({ userId }, { counts: 1 }).lean();
  return { followers: p?.counts?.followers ?? 0, following: p?.counts?.following ?? 0 };
}

/** Creates a follow edge and bumps both counters. Idempotent. */
export async function addFollowEdge(followerId: Types.ObjectId, followeeId: Types.ObjectId, session: ClientSession) {
  const res = await Follow.updateOne(
    { followerId, followeeId },
    { $setOnInsert: { followerId, followeeId, createdAt: new Date() } },
    { upsert: true, session },
  );
  if (res.upsertedCount) {
    await Profile.updateOne({ userId: followerId }, { $inc: { 'counts.following': 1 } }, { session });
    await Profile.updateOne({ userId: followeeId }, { $inc: { 'counts.followers': 1 } }, { session });
  }
}

/** Removes a follow edge and decrements both counters. Idempotent. */
export async function removeFollowEdge(followerId: Types.ObjectId, followeeId: Types.ObjectId, session: ClientSession) {
  const res = await Follow.deleteOne({ followerId, followeeId }, { session });
  if (res.deletedCount) {
    await Profile.updateOne({ userId: followerId, 'counts.following': { $gt: 0 } }, { $inc: { 'counts.following': -1 } }, { session });
    await Profile.updateOne({ userId: followeeId, 'counts.followers': { $gt: 0 } }, { $inc: { 'counts.followers': -1 } }, { session });
  }
}

async function result(viewerId: string, target: Types.ObjectId): Promise<FollowResultDto> {
  const relationship = await getRelationship(viewerId, target);
  return {
    status: relationship.following ? 'following' : relationship.requested ? 'requested' : 'not_following',
    relationship,
    counts: await counts(target),
  };
}

export async function follow(viewerId: string, username: string): Promise<FollowResultDto> {
  await requireOwnProfile(viewerId);
  const target = await resolveVisibleProfile(username, viewerId);
  if (target.userId.equals(viewerId)) throw badRequest('You cannot follow yourself');
  if (await isBlockedEitherWay(viewerId, target.userId)) throw forbidden('You cannot follow this account');
  const v = oid(viewerId);
  if (!(await Follow.exists({ followerId: v, followeeId: target.userId }))) {
    if (target.isPrivate) {
      await FollowRequest.updateOne({ requesterId: v, targetId: target.userId }, { $setOnInsert: { createdAt: new Date() } }, { upsert: true });
    } else {
      await mongoose.connection.transaction((s) => addFollowEdge(v, target.userId, s));
    }
  }
  return result(viewerId, target.userId);
}

/** Unfollow, or cancel a pending request. */
export async function unfollow(viewerId: string, username: string): Promise<FollowResultDto> {
  const target = await resolveVisibleProfile(username, viewerId);
  const v = oid(viewerId);
  await FollowRequest.deleteOne({ requesterId: v, targetId: target.userId });
  await mongoose.connection.transaction((s) => removeFollowEdge(v, target.userId, s));
  return result(viewerId, target.userId);
}

export async function removeFollower(viewerId: string, username: string) {
  const follower = await Profile.findOne({ username: username.toLowerCase() }, { userId: 1 }).lean();
  if (!follower) throw notFound('This account does not exist or is unavailable');
  await mongoose.connection.transaction((s) => removeFollowEdge(follower.userId, oid(viewerId), s));
  return { counts: await counts(oid(viewerId)) };
}

export async function listIncomingRequests(viewerId: string, limit: number, cursor?: string): Promise<Page<FollowRequestDto>> {
  const hidden = await hiddenUserIds(viewerId);
  const rows = await FollowRequest.find({ targetId: oid(viewerId), requesterId: { $nin: hidden }, ...cursorFilter(cursor) })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();
  const page = rows.slice(0, limit);
  const profiles = await profilesInOrder(page.map((r) => r.requesterId));
  const summaries = new Map((await toSummaries(profiles, viewerId)).map((s) => [s.userId, s]));
  return {
    items: page.flatMap((r) => {
      const from = summaries.get(String(r.requesterId));
      return from ? [{ id: String(r._id), from, createdAt: r.createdAt.toISOString() }] : [];
    }),
    nextCursor: rows.length > limit && page.length ? encodeCursor(page[page.length - 1]!) : null,
  };
}

export async function approveRequest(viewerId: string, requestId: string) {
  const req = await FollowRequest.findOne({ _id: requestId, targetId: oid(viewerId) }).lean();
  if (!req) throw notFound('Follow request not found');
  await mongoose.connection.transaction(async (s) => {
    await FollowRequest.deleteOne({ _id: req._id }, { session: s });
    await addFollowEdge(req.requesterId, req.targetId, s);
  });
  return { counts: await counts(oid(viewerId)) };
}

export async function declineRequest(viewerId: string, requestId: string) {
  const res = await FollowRequest.deleteOne({ _id: requestId, targetId: oid(viewerId) });
  if (!res.deletedCount) throw notFound('Follow request not found');
}

/** When an account goes public, everyone waiting is let in. */
export async function approveAllPending(userId: Types.ObjectId) {
  const pending = await FollowRequest.find({ targetId: userId }, { requesterId: 1 }).lean();
  for (const p of pending) {
    await mongoose.connection.transaction(async (s) => {
      await FollowRequest.deleteOne({ _id: p._id }, { session: s });
      await addFollowEdge(p.requesterId, userId, s);
    });
  }
}

type Direction = 'followers' | 'following';

/** Followers or following of a profile, newest first, respecting privacy and blocks. */
export async function listConnections(username: string, direction: Direction, viewerId: string | undefined, limit: number, cursor?: string): Promise<Page<ProfileSummaryDto>> {
  const profile = await resolveVisibleProfile(username, viewerId);
  const rel = viewerId ? await getRelationship(viewerId, profile.userId) : null;
  if (!canViewContent(profile, rel)) throw forbidden('This account is private');
  const hidden = viewerId ? await hiddenUserIds(viewerId) : [];
  const [own, other] = direction === 'followers' ? (['followeeId', 'followerId'] as const) : (['followerId', 'followeeId'] as const);
  const rows = await Follow.find({ [own]: profile.userId, [other]: { $nin: hidden }, ...cursorFilter(cursor) })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();
  const page = rows.slice(0, limit);
  const profiles = await profilesInOrder(page.map((r) => r[other]));
  return {
    items: await toSummaries(profiles, viewerId),
    nextCursor: rows.length > limit && page.length ? encodeCursor(page[page.length - 1]!) : null,
  };
}

/** Accounts the viewer follows that also follow this profile. */
export async function mutualFollowers(username: string, viewerId: string, limit: number) {
  const profile = await resolveVisibleProfile(username, viewerId);
  const v = oid(viewerId);
  if (profile.userId.equals(v)) return { items: [], total: 0 };
  const pipeline = [
    { $match: { followeeId: profile.userId } },
    { $lookup: { from: Follow.collection.name, let: { f: '$followerId' }, as: 'viewerFollows',
      pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$followerId', v] }, { $eq: ['$followeeId', '$$f'] }] } } }, { $limit: 1 }] } },
    { $match: { 'viewerFollows.0': { $exists: true } } },
    { $sort: { createdAt: -1 as const } },
    { $facet: { items: [{ $limit: limit }, { $project: { followerId: 1 } }], total: [{ $count: 'n' }] } },
  ];
  const [agg] = await Follow.aggregate<{ items: { followerId: Types.ObjectId }[]; total: { n: number }[] }>(pipeline);
  const profiles = await profilesInOrder((agg?.items ?? []).map((i) => i.followerId));
  return { items: await toSummaries(profiles, viewerId), total: agg?.total[0]?.n ?? 0 };
}

/**
 * Onboarding and discovery suggestions: popular accounts sharing the
 * viewer's interests, excluding self, already-followed, requested and blocked.
 */
export async function suggestions(viewerId: string, limit: number): Promise<ProfileSummaryDto[]> {
  const v = oid(viewerId);
  const me = await Profile.findOne({ userId: v }, { interests: 1 }).lean();
  const [followed, requested, hidden] = await Promise.all([
    Follow.find({ followerId: v }, { followeeId: 1 }).limit(5000).lean(),
    FollowRequest.find({ requesterId: v }, { targetId: 1 }).limit(1000).lean(),
    hiddenUserIds(v),
  ]);
  const exclude = [v, ...followed.map((f) => f.followeeId), ...requested.map((r) => r.targetId), ...hidden];
  const base = { userId: { $nin: exclude }, visible: true };
  const interests = me?.interests ?? [];
  const matched = interests.length
    ? await Profile.find({ ...base, interests: { $in: interests } }).sort({ 'counts.followers': -1, _id: 1 }).limit(limit).lean()
    : [];
  const fill = matched.length < limit
    ? await Profile.find({ ...base, _id: { $nin: matched.map((m) => m._id) } }).sort({ 'counts.followers': -1, _id: 1 }).limit(limit - matched.length).lean()
    : [];
  return toSummaries([...matched, ...fill], viewerId);
}

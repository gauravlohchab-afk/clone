import mongoose, { type Types } from 'mongoose';
import { Follow } from './follow.model.js';
import { FollowRequest } from './follow-request.model.js';
import { removeFollowEdge } from './follows.service.js';
import { Block, Mute, Restriction } from '../relationships/relationship.models.js';

/** Account purge: remove every edge touching the user and fix other people's counts. */
export async function purgeRelationships(userId: Types.ObjectId) {
  const edges = await Follow.find({ $or: [{ followerId: userId }, { followeeId: userId }] }, { followerId: 1, followeeId: 1 }).lean();
  for (const e of edges) {
    await mongoose.connection.transaction((s) => removeFollowEdge(e.followerId, e.followeeId, s));
  }
  await FollowRequest.deleteMany({ $or: [{ requesterId: userId }, { targetId: userId }] });
  for (const M of [Block, Restriction, Mute]) await M.deleteMany({ $or: [{ userId }, { targetId: userId }] });
}

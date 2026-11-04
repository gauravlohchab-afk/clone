import { Schema, model } from 'mongoose';

const pair = {
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
};

/** Blocking hides both accounts from each other and removes follows both ways. */
const blockSchema = new Schema(pair, { timestamps: { createdAt: true, updatedAt: false } });
blockSchema.index({ userId: 1, targetId: 1 }, { unique: true });
blockSchema.index({ targetId: 1, userId: 1 });
blockSchema.index({ userId: 1, createdAt: -1, _id: -1 });
export const Block = model('Block', blockSchema);

/**
 * Restricting is quiet: the restricted account's comments are visible only to
 * themselves and their messages go to requests (enforced by those modules).
 */
const restrictionSchema = new Schema(pair, { timestamps: { createdAt: true, updatedAt: false } });
restrictionSchema.index({ userId: 1, targetId: 1 }, { unique: true });
restrictionSchema.index({ userId: 1, createdAt: -1, _id: -1 });
export const Restriction = model('Restriction', restrictionSchema);

/** Muting hides posts and/or stories from the feed without unfollowing. */
const muteSchema = new Schema(
  { ...pair, posts: { type: Boolean, default: true }, stories: { type: Boolean, default: true } },
  { timestamps: true },
);
muteSchema.index({ userId: 1, targetId: 1 }, { unique: true });
muteSchema.index({ userId: 1, createdAt: -1, _id: -1 });
export const Mute = model('Mute', muteSchema);

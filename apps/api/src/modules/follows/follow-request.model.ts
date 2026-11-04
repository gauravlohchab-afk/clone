import { Schema, model } from 'mongoose';

/** Pending request to follow a private account. Deleted on approve, decline or cancel. */
const followRequestSchema = new Schema(
  {
    requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
followRequestSchema.index({ requesterId: 1, targetId: 1 }, { unique: true });
followRequestSchema.index({ targetId: 1, createdAt: -1, _id: -1 });

export const FollowRequest = model('FollowRequest', followRequestSchema);

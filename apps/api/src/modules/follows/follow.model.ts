import { Schema, model } from 'mongoose';

/** An accepted follow edge. Counts on profiles are updated in the same transaction. */
const followSchema = new Schema(
  {
    followerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    followeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
followSchema.index({ followerId: 1, followeeId: 1 }, { unique: true });
followSchema.index({ followeeId: 1, createdAt: -1, _id: -1 });
followSchema.index({ followerId: 1, createdAt: -1, _id: -1 });

export const Follow = model('Follow', followSchema);

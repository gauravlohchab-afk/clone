import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

/**
 * One document per signed-in device. The refresh token rotates on every use;
 * retired hashes are kept briefly so a replayed token can be detected and the
 * whole session revoked (refresh token reuse detection).
 */
const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    refreshHash: { type: String, required: true },
    retired: { type: [{ hash: String, at: Date, _id: false }], default: [] },
    platform: { type: String, enum: ['web', 'ios', 'android', 'unknown'], default: 'unknown' },
    deviceName: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
    method: { type: String, enum: ['password', 'google'], required: true },
    lastUsedAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokeReason: { type: String, default: null },
  },
  { timestamps: true },
);

sessionSchema.index({ refreshHash: 1 }, { unique: true });
sessionSchema.index({ 'retired.hash': 1 });
sessionSchema.index({ userId: 1, revokedAt: 1, lastUsedAt: -1 });
// Expired sessions are removed 7 days after expiry (retention policy).
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });

export type SessionAttrs = InferSchemaType<typeof sessionSchema>;
export type SessionDoc = HydratedDocument<SessionAttrs>;
export const Session = model('Session', sessionSchema);

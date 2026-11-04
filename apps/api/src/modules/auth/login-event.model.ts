import { Schema, model } from 'mongoose';

/** Security-relevant account events shown to the user as "Login activity". Kept 180 days. */
const loginEventSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['login', 'login_failed', 'logout', 'password_reset', 'password_changed', 'mfa_enabled', 'mfa_disabled', 'session_revoked', 'refresh_reuse_detected'],
      required: true,
    },
    method: { type: String, enum: ['password', 'google', 'refresh', 'n/a'], default: 'n/a' },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
loginEventSchema.index({ userId: 1, createdAt: -1 });
loginEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 });

export const LoginEvent = model('LoginEvent', loginEventSchema);

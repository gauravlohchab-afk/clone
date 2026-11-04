import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

/**
 * Account identity and credentials. Public-facing fields live on Profile so
 * that sensitive data (email, hashes, MFA) never travels with profile reads.
 */
const userSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    emailVerifiedAt: { type: Date, default: null },
    passwordHash: { type: String, default: null, select: false },
    passwordChangedAt: { type: Date, default: null },
    googleSub: { type: String, default: undefined },
    username: { type: String, default: undefined, lowercase: true },
    role: { type: String, enum: ['user', 'moderator', 'admin', 'superadmin'], default: 'user' },
    status: {
      type: String,
      enum: ['active', 'deactivated', 'pending_deletion', 'suspended', 'banned'],
      default: 'active',
    },
    dateOfBirth: { type: String, required: true },
    termsAcceptedAt: { type: Date, required: true },
    onboardingCompletedAt: { type: Date, default: null },
    mfa: {
      enabled: { type: Boolean, default: false },
      secretEnc: { type: String, default: null, select: false },
      pendingSecretEnc: { type: String, default: null, select: false },
      recoveryCodeHashes: { type: [String], default: [], select: false },
      lastUsedStep: { type: Number, default: 0, select: false },
    },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    deactivatedAt: { type: Date, default: null },
    deletionScheduledFor: { type: Date, default: null },
    lastActiveAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true, partialFilterExpression: { username: { $type: 'string' } } });
userSchema.index({ googleSub: 1 }, { unique: true, partialFilterExpression: { googleSub: { $type: 'string' } } });
userSchema.index({ status: 1, deletionScheduledFor: 1 });
userSchema.index({ createdAt: -1 });

export type UserAttrs = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserAttrs>;
export const User = model('User', userSchema);

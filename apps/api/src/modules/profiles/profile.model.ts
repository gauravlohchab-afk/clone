import { Schema, Types, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const mediaRef = new Schema(
  { mediaId: { type: Schema.Types.ObjectId, ref: 'Media' }, url: String },
  { _id: false },
);

/** Public profile. One per user; created once a username is chosen. */
const profileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true, lowercase: true },
    displayName: { type: String, default: '' },
    bio: { type: String, default: '' },
    website: { type: String, default: '' },
    location: { type: String, default: '' },
    avatar: { type: mediaRef, default: null },
    cover: { type: mediaRef, default: null },
    accountType: { type: String, enum: ['personal', 'creator', 'professional'], default: 'personal' },
    category: { type: String, default: '' },
    isPrivate: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    /** Hidden while the owning account is deactivated, pending deletion, or banned. */
    visible: { type: Boolean, default: true },
    interests: { type: [String], default: [] },
    counts: {
      posts: { type: Number, default: 0, min: 0 },
      followers: { type: Number, default: 0, min: 0 },
      following: { type: Number, default: 0, min: 0 },
    },
  },
  { timestamps: true },
);

profileSchema.index({ userId: 1 }, { unique: true });
profileSchema.index({ username: 1 }, { unique: true });
profileSchema.index({ interests: 1, 'counts.followers': -1 });
profileSchema.index({ username: 'text', displayName: 'text' }, { weights: { username: 3, displayName: 2 } });

export type ProfileAttrs = InferSchemaType<typeof profileSchema> & { _id: Types.ObjectId };
export type ProfileDoc = HydratedDocument<ProfileAttrs>;
export const Profile = model('Profile', profileSchema);

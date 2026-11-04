import { Schema, model, type InferSchemaType } from 'mongoose';

const settingsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    theme: { type: String, enum: ['system', 'light', 'dark'], default: 'system' },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
    country: { type: String, default: '' },
    privacy: {
      showActivityStatus: { type: Boolean, default: true },
      allowMentionsFrom: { type: String, enum: ['everyone', 'following', 'nobody'], default: 'everyone' },
      allowMessagesFrom: { type: String, enum: ['everyone', 'following', 'nobody'], default: 'everyone' },
      allowCommentsFrom: { type: String, enum: ['everyone', 'following', 'followers', 'nobody'], default: 'everyone' },
      hiddenWords: { type: [String], default: [] },
    },
    notifications: {
      likes: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      follows: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);
settingsSchema.index({ userId: 1 }, { unique: true });

export type SettingsAttrs = InferSchemaType<typeof settingsSchema>;
export const Settings = model('Settings', settingsSchema);

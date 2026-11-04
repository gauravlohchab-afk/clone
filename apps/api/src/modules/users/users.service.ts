import mongoose from 'mongoose';
import type { MeDto, SettingsDto } from '@vyro/types';
import { ageOn } from '@vyro/shared';
import { username as usernameSchema } from '@vyro/validation';
import { conflict, forbidden, notFound } from '../../lib/errors.js';
import { User, type UserDoc } from './user.model.js';
import { Profile } from '../profiles/profile.model.js';
import { Settings } from '../settings/settings.model.js';
import { Session } from '../auth/session.model.js';
import { AuthToken } from '../auth/auth-token.model.js';
import { LoginEvent } from '../auth/login-event.model.js';
import { toLoginActivityDto, toMeDto, toProfileDto, toSessionDto, toSettingsDto } from './users.mapper.js';

const DELETION_GRACE_DAYS = 30;

export async function buildMe(user: UserDoc): Promise<MeDto> {
  const profile = await Profile.findOne({ userId: user._id }).lean();
  let hasPassword = user.passwordHash !== undefined ? !!user.passwordHash : undefined;
  if (hasPassword === undefined) {
    const withHash = await User.findById(user._id, { passwordHash: 1 }).select('+passwordHash').lean();
    hasPassword = !!withHash?.passwordHash;
  }
  return toMeDto(user, profile, hasPassword);
}

async function requireUser(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw notFound('Account not found');
  return user;
}

export async function getMe(userId: string) {
  return buildMe(await requireUser(userId));
}

export async function checkUsername(raw: string, forUserId?: string) {
  const parsed = usernameSchema.safeParse(raw);
  if (!parsed.success) return { username: raw, available: false, reason: parsed.error.issues[0]?.message ?? 'Invalid username', suggestions: [] };
  const name = parsed.data;
  const owner = await User.findOne({ username: name }, { _id: 1 }).lean();
  if (!owner || (forUserId && String(owner._id) === forUserId)) return { username: name, available: true, reason: null, suggestions: [] };

  const base = name.slice(0, 26);
  const candidates = [`${base}_`, `${base}.vy`, ...Array.from({ length: 6 }, () => `${base}${Math.floor(10 + Math.random() * 990)}`)];
  const taken = new Set((await User.find({ username: { $in: candidates } }, { username: 1 }).lean()).map((u) => u.username));
  const suggestions = candidates.filter((c) => !taken.has(c) && usernameSchema.safeParse(c).success).slice(0, 3);
  return { username: name, available: false, reason: 'That username is taken', suggestions };
}

/**
 * Sets or changes the username on both User and Profile in one transaction.
 * The unique indexes on both collections are the final arbiter of races.
 */
export async function setUsername(userId: string, name: string) {
  const user = await requireUser(userId);
  if (!user.emailVerifiedAt) throw forbidden('Verify your email address first', 'EMAIL_NOT_VERIFIED');
  if (user.username === name) return buildMe(user);
  const availability = await checkUsername(name, userId);
  if (!availability.available) throw conflict(availability.reason ?? 'That username is taken');

  await mongoose.connection.transaction(async (session) => {
    await User.updateOne({ _id: user._id }, { username: name }, { session });
    const existing = await Profile.findOne({ userId: user._id }, { _id: 1 }, { session });
    if (existing) {
      await Profile.updateOne({ _id: existing._id }, { username: name }, { session });
    } else {
      // Under-18 accounts start private (age-appropriate default).
      const isMinor = ageOn(user.dateOfBirth) < 18;
      await Profile.create([{ userId: user._id, username: name, isPrivate: isMinor }], { session });
    }
  });
  return getMe(userId);
}

async function requireProfile(userId: string) {
  const profile = await Profile.findOne({ userId });
  if (!profile) throw conflict('Choose a username first');
  return profile;
}

export async function updateProfile(userId: string, input: Record<string, unknown>) {
  const profile = await requireProfile(userId);
  profile.set(input);
  await profile.save();
  return toProfileDto(profile.toObject());
}

export async function setInterests(userId: string, interests: string[]) {
  const profile = await requireProfile(userId);
  profile.interests = interests;
  await profile.save();
  return toProfileDto(profile.toObject());
}

export async function completeOnboarding(userId: string) {
  const user = await requireUser(userId);
  if (!user.username) throw conflict('Choose a username first');
  user.onboardingCompletedAt ??= new Date();
  await user.save();
  return buildMe(user);
}

export async function getSettings(userId: string): Promise<SettingsDto> {
  const doc = await Settings.findOneAndUpdate({ userId }, { $setOnInsert: { userId } }, { upsert: true, new: true }).lean();
  return toSettingsDto(doc as unknown as SettingsDto);
}

/** Flattens nested partial objects to dot paths so unspecified keys are kept. */
function toDotPaths(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, toDotPaths(v as Record<string, unknown>, key));
    else out[key] = v;
  }
  return out;
}

export async function updateSettings(userId: string, input: Record<string, unknown>) {
  const doc = await Settings.findOneAndUpdate(
    { userId },
    { $set: toDotPaths(input), $setOnInsert: { userId } },
    { upsert: true, new: true, runValidators: true },
  ).lean();
  return toSettingsDto(doc as unknown as SettingsDto);
}

async function hideAndSignOut(user: UserDoc, reason: string) {
  await Profile.updateOne({ userId: user._id }, { visible: false });
  await Session.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date(), revokeReason: reason });
}

export async function deactivate(user: UserDoc) {
  user.status = 'deactivated';
  user.deactivatedAt = new Date();
  await user.save();
  await hideAndSignOut(user, 'deactivated');
}

export async function scheduleDeletion(user: UserDoc) {
  user.status = 'pending_deletion';
  user.deletionScheduledFor = new Date(Date.now() + DELETION_GRACE_DAYS * 24 * 3600_000);
  await user.save();
  await hideAndSignOut(user, 'deletion_scheduled');
  return user.deletionScheduledFor;
}

export async function cancelDeletion(userId: string) {
  const user = await requireUser(userId);
  if (user.status !== 'pending_deletion') throw conflict('This account is not scheduled for deletion');
  user.status = 'active';
  user.deletionScheduledFor = null;
  await user.save();
  await Profile.updateOne({ userId: user._id }, { visible: true });
  return buildMe(user);
}

/**
 * Hooks each content module registers so account purge removes its data.
 * Later phases (posts, media, messages...) add hooks here.
 */
type PurgeHook = (userId: mongoose.Types.ObjectId) => Promise<void>;
const purgeHooks: PurgeHook[] = [
  async (id) => void (await Profile.deleteOne({ userId: id })),
  async (id) => void (await Settings.deleteOne({ userId: id })),
  async (id) => void (await Session.deleteMany({ userId: id })),
  async (id) => void (await AuthToken.deleteMany({ userId: id })),
  async (id) => void (await LoginEvent.deleteMany({ userId: id })),
];
export const registerPurgeHook = (hook: PurgeHook) => purgeHooks.push(hook);

/** Permanently deletes accounts whose grace period has ended. Run by a scheduled job. */
export async function purgeDueAccounts(now = new Date()) {
  const due = await User.find({ status: 'pending_deletion', deletionScheduledFor: { $lte: now } }, { _id: 1 }).limit(100).lean();
  for (const { _id } of due) {
    for (const hook of purgeHooks) await hook(_id);
    await User.deleteOne({ _id });
  }
  return due.length;
}

/** Synchronous JSON export of the account's own data. Media archives arrive with the media module. */
export async function exportData(userId: string, currentSessionId: string) {
  const user = await requireUser(userId);
  const [me, settings, sessions, events] = await Promise.all([
    buildMe(user),
    getSettings(userId),
    Session.find({ userId }).sort({ createdAt: -1 }).limit(100).lean(),
    LoginEvent.find({ userId }).sort({ createdAt: -1 }).limit(1000).lean(),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    account: { ...me, dateOfBirth: user.dateOfBirth },
    settings,
    sessions: sessions.map((s) => toSessionDto(s, currentSessionId)),
    loginActivity: events.map(toLoginActivityDto),
  };
}

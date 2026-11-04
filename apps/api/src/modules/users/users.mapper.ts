import type { MeDto, ProfileDto, SessionDto, LoginActivityDto, SettingsDto } from '@vyro/types';
import type { UserDoc } from './user.model.js';
import type { ProfileAttrs } from '../profiles/profile.model.js';

type Lean<T> = T & { _id: { toString(): string }; createdAt: Date };

export function toProfileDto(p: Lean<ProfileAttrs>): ProfileDto {
  return {
    userId: String(p.userId),
    username: p.username,
    displayName: p.displayName,
    bio: p.bio,
    website: p.website,
    location: p.location,
    avatarUrl: p.avatar?.url ?? null,
    coverUrl: p.cover?.url ?? null,
    accountType: p.accountType,
    category: p.category,
    isPrivate: p.isPrivate,
    isVerified: p.isVerified,
    interests: p.interests,
    counts: { posts: p.counts?.posts ?? 0, followers: p.counts?.followers ?? 0, following: p.counts?.following ?? 0 },
    createdAt: p.createdAt.toISOString(),
  };
}

export function toMeDto(user: UserDoc, profile: Lean<ProfileAttrs> | null, hasPassword: boolean): MeDto {
  return {
    id: user.id,
    email: user.email,
    emailVerified: !!user.emailVerifiedAt,
    username: user.username ?? null,
    role: user.role,
    status: user.status,
    mfaEnabled: !!user.mfa?.enabled,
    hasPassword,
    googleLinked: !!user.googleSub,
    onboardingCompleted: !!user.onboardingCompletedAt,
    createdAt: (user.get('createdAt') as Date).toISOString(),
    profile: profile ? toProfileDto(profile) : null,
  };
}

export function toSessionDto(
  s: { _id: { toString(): string }; platform: string; deviceName: string; ip: string; createdAt: Date; lastUsedAt: Date },
  currentId: string,
): SessionDto {
  return {
    id: s._id.toString(),
    current: s._id.toString() === currentId,
    deviceName: s.deviceName,
    platform: s.platform as SessionDto['platform'],
    ip: s.ip,
    createdAt: s.createdAt.toISOString(),
    lastUsedAt: s.lastUsedAt.toISOString(),
  };
}

export function toLoginActivityDto(e: { _id: { toString(): string }; type: string; ip: string; userAgent: string; method: string; createdAt: Date }): LoginActivityDto {
  return {
    id: e._id.toString(),
    type: e.type as LoginActivityDto['type'],
    ip: e.ip,
    userAgent: e.userAgent,
    method: e.method as LoginActivityDto['method'],
    createdAt: e.createdAt.toISOString(),
  };
}

export function toSettingsDto(s: SettingsDto): SettingsDto {
  return {
    theme: s.theme,
    language: s.language,
    timezone: s.timezone,
    country: s.country,
    privacy: { ...s.privacy, hiddenWords: [...s.privacy.hiddenWords] },
    notifications: { ...s.notifications },
  };
}

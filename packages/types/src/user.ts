export type AccountType = 'personal' | 'creator' | 'professional';
export type AccountStatus = 'active' | 'deactivated' | 'pending_deletion' | 'suspended' | 'banned';
export type UserRole = 'user' | 'moderator' | 'admin' | 'superadmin';

/** The signed-in user's own view of their account. Never sent for other users. */
export interface MeDto {
  id: string;
  email: string;
  emailVerified: boolean;
  username: string | null;
  role: UserRole;
  status: AccountStatus;
  mfaEnabled: boolean;
  hasPassword: boolean;
  googleLinked: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  profile: ProfileDto | null;
}

export interface ProfileDto {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  website: string;
  location: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  accountType: AccountType;
  category: string;
  isPrivate: boolean;
  isVerified: boolean;
  interests: string[];
  counts: { posts: number; followers: number; following: number };
  createdAt: string;
}

/** What a viewer sees on another user's profile, including relationship state. */
export interface PublicProfileDto extends ProfileDto {
  viewer: {
    isSelf: boolean;
    canViewContent: boolean;
    /** Null for signed-out viewers. */
    relationship: import('./social.js').RelationshipDto | null;
  };
}

export interface SessionDto {
  id: string;
  current: boolean;
  deviceName: string;
  platform: 'web' | 'ios' | 'android' | 'unknown';
  ip: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface LoginActivityDto {
  id: string;
  type: 'login' | 'login_failed' | 'logout' | 'password_reset' | 'mfa_enabled' | 'mfa_disabled' | 'session_revoked' | 'refresh_reuse_detected';
  ip: string;
  userAgent: string;
  method: 'password' | 'google' | 'refresh' | 'n/a';
  createdAt: string;
}

export interface SettingsDto {
  theme: 'system' | 'light' | 'dark';
  language: string;
  timezone: string;
  country: string;
  privacy: {
    showActivityStatus: boolean;
    allowMentionsFrom: 'everyone' | 'following' | 'nobody';
    allowMessagesFrom: 'everyone' | 'following' | 'nobody';
    allowCommentsFrom: 'everyone' | 'following' | 'followers' | 'nobody';
    hiddenWords: string[];
  };
  notifications: {
    likes: boolean;
    comments: boolean;
    follows: boolean;
    mentions: boolean;
    messages: boolean;
    email: boolean;
    push: boolean;
  };
}

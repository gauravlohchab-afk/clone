import type { AuthSuccess, LoginResult, MfaSetupDto } from '@vyro/types';
import { limits } from '@vyro/config';
import { ageOn, MINIMUM_AGE } from '@vyro/shared';
import type { AppContext } from '../../context.js';
import { AppError, badRequest, conflict, forbidden, notConfigured, notFound, unauthenticated } from '../../lib/errors.js';
import { randomToken, sha256 } from '../../lib/crypto.js';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../../lib/password.js';
import { renderEmail } from '../../lib/mailer.js';
import { User, type UserDoc } from '../users/user.model.js';
import { Profile } from '../profiles/profile.model.js';
import { buildMe } from '../users/users.service.js';
import { Session } from './session.model.js';
import { AuthToken } from './auth-token.model.js';
import { LoginEvent } from './login-event.model.js';
import { encryptSecret, generateRecoveryCodes, matchTotp, newTotpSecret, normaliseRecoveryCode, otpauthUrl } from './mfa.js';

export interface ClientInfo {
  ip: string;
  userAgent: string;
  platform: 'web' | 'ios' | 'android';
  deviceName?: string;
}

const LOCK_THRESHOLD = 5;
const REFRESH_RACE_GRACE_MS = 10_000;
const VERIFY_TTL_MS = 24 * 3600_000;
const RESET_TTL_MS = 3600_000;
const MFA_SELECT = '+passwordHash +mfa.secretEnc +mfa.pendingSecretEnc +mfa.recoveryCodeHashes +mfa.lastUsedStep';

function logEvent(userId: unknown, type: string, client: Partial<ClientInfo>, method = 'n/a') {
  return LoginEvent.create({ userId, type, method, ip: client.ip ?? '', userAgent: (client.userAgent ?? '').slice(0, 300) });
}

function assertAge(dateOfBirth: string) {
  if (ageOn(dateOfBirth) < MINIMUM_AGE) {
    throw badRequest(`You must be at least ${MINIMUM_AGE} to use this service`, [
      { path: 'dateOfBirth', message: `You must be at least ${MINIMUM_AGE}` },
    ]);
  }
}

function assertCanSignIn(user: UserDoc) {
  if (user.status === 'suspended' || user.status === 'banned') {
    throw forbidden('This account has been suspended. You can appeal from the help centre.', 'ACCOUNT_SUSPENDED');
  }
}

export function createAuthService(ctx: AppContext) {
  const { env, jwt, mailer, brandName } = ctx;
  const refreshTtlMs = env.REFRESH_TOKEN_TTL_DAYS * 24 * 3600_000;

  async function issueSession(user: UserDoc, method: 'password' | 'google', client: ClientInfo): Promise<AuthSuccess> {
    const refreshToken = randomToken(32);
    const session = await Session.create({
      userId: user._id,
      refreshHash: sha256(refreshToken),
      platform: client.platform,
      deviceName: (client.deviceName ?? '').slice(0, 80),
      userAgent: client.userAgent.slice(0, 300),
      ip: client.ip,
      method,
      expiresAt: new Date(Date.now() + refreshTtlMs),
    });
    // Cap concurrent sessions: revoke the least recently used beyond the limit.
    const stale = await Session.find({ userId: user._id, revokedAt: null }, { _id: 1 })
      .sort({ lastUsedAt: -1 })
      .skip(limits.sessionsPerUser)
      .lean();
    if (stale.length) {
      await Session.updateMany({ _id: { $in: stale.map((s) => s._id) } }, { revokedAt: new Date(), revokeReason: 'session_limit' });
    }
    const access = await jwt.signAccess({ sub: user.id, sid: session.id, role: user.role });
    return {
      status: 'authenticated',
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshToken,
      user: await buildMe(user),
    };
  }

  async function completeLogin(user: UserDoc, method: 'password' | 'google', client: ClientInfo) {
    if (user.status === 'deactivated') {
      user.status = 'active';
      user.deactivatedAt = null;
      await Profile.updateOne({ userId: user._id }, { visible: true });
    }
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    user.lastActiveAt = new Date();
    await user.save();
    await logEvent(user._id, 'login', client, method);
    return issueSession(user, method, client);
  }

  async function registerFailure(user: UserDoc, client: ClientInfo, method: string) {
    user.failedLoginCount += 1;
    if (user.failedLoginCount >= LOCK_THRESHOLD) {
      const minutes = Math.min(15 * 2 ** (user.failedLoginCount - LOCK_THRESHOLD), 24 * 60);
      user.lockedUntil = new Date(Date.now() + minutes * 60_000);
    }
    await user.save();
    await logEvent(user._id, 'login_failed', client, method);
  }

  function assertNotLocked(user: UserDoc) {
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(429, 'ACCOUNT_LOCKED', 'Too many failed attempts. Try again later or reset your password.');
    }
  }

  async function createToken(userId: unknown, purpose: 'verify_email' | 'reset_password', ttlMs: number) {
    await AuthToken.deleteMany({ userId, purpose, usedAt: null });
    const token = randomToken(32);
    await AuthToken.create({ userId, purpose, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMs) });
    return token;
  }

  async function consumeToken(token: string, purpose: 'verify_email' | 'reset_password') {
    const doc = await AuthToken.findOneAndUpdate(
      { tokenHash: sha256(token), purpose, usedAt: null, expiresAt: { $gt: new Date() } },
      { usedAt: new Date() },
    );
    if (!doc) throw badRequest('This link is invalid or has expired. Request a new one.');
    return doc;
  }

  async function sendVerification(user: UserDoc) {
    const token = await createToken(user._id, 'verify_email', VERIFY_TTL_MS);
    const url = `${env.APP_URL}/verify-email?token=${token}`;
    await mailer.send({
      to: user.email,
      subject: `Verify your ${brandName} email`,
      ...renderEmail(brandName, 'Confirm your email', 'Tap the button below to verify your email address. This link expires in 24 hours.', { label: 'Verify email', url }),
    });
  }

  /** Accepts a 6-digit TOTP or a single-use recovery code. Mutates `user` on success. */
  function consumeSecondFactor(user: UserDoc, code: string): boolean {
    const mfa = user.mfa;
    if (!mfa?.enabled || !mfa.secretEnc) return false;
    const step = matchTotp(code, mfa.secretEnc, env.MFA_ENCRYPTION_KEY, mfa.lastUsedStep ?? 0);
    if (step !== null) {
      mfa.lastUsedStep = step;
      return true;
    }
    const hash = sha256(normaliseRecoveryCode(code));
    const idx = mfa.recoveryCodeHashes.indexOf(hash);
    if (idx >= 0) {
      mfa.recoveryCodeHashes.splice(idx, 1);
      return true;
    }
    return false;
  }

  async function loadForSecurity(userId: string) {
    const user = await User.findById(userId).select(MFA_SELECT);
    if (!user) throw notFound('Account not found');
    return user;
  }

  /** Re-authentication for sensitive actions: password if set, otherwise a 2FA code if enabled. */
  async function confirmIdentity(user: UserDoc, input: { password?: string; code?: string }) {
    if (user.passwordHash) {
      if (!input.password || !(await verifyPassword(user.passwordHash, input.password))) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Your password is incorrect');
      }
    } else if (user.mfa?.enabled) {
      if (!input.code || !consumeSecondFactor(user, input.code)) throw new AppError(401, 'MFA_INVALID', 'That code is not valid');
    }
  }

  return {
    sendVerification,
    confirmIdentity,
    loadForSecurity,

    async register(input: { email: string; password: string; dateOfBirth: string }, client: ClientInfo) {
      assertAge(input.dateOfBirth);
      if (await User.exists({ email: input.email })) throw conflict('An account with this email already exists');
      const user = await User.create({
        email: input.email,
        passwordHash: await hashPassword(input.password),
        dateOfBirth: input.dateOfBirth,
        termsAcceptedAt: new Date(),
      });
      await sendVerification(user);
      await logEvent(user._id, 'login', client, 'password');
      return issueSession(user, 'password', client);
    },

    async login(input: { identifier: string; password: string }, client: ClientInfo): Promise<LoginResult> {
      const query = input.identifier.includes('@') ? { email: input.identifier } : { username: input.identifier };
      const user = await User.findOne(query).select(MFA_SELECT);
      if (!user || !user.passwordHash) {
        await burnPasswordCheck(input.password);
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email, username or password');
      }
      assertNotLocked(user);
      if (!(await verifyPassword(user.passwordHash, input.password))) {
        await registerFailure(user, client, 'password');
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email, username or password');
      }
      assertCanSignIn(user);
      if (user.mfa?.enabled) return { status: 'mfa_required', mfaToken: await jwt.signMfa(user.id) };
      return completeLogin(user, 'password', client);
    },

    async loginMfa(input: { mfaToken: string; code: string }, client: ClientInfo) {
      const userId = await jwt.verifyMfa(input.mfaToken);
      const user = await loadForSecurity(userId);
      assertNotLocked(user);
      assertCanSignIn(user);
      if (!consumeSecondFactor(user, input.code)) {
        await registerFailure(user, client, user.googleSub && !user.passwordHash ? 'google' : 'password');
        throw new AppError(401, 'MFA_INVALID', 'That code is not valid');
      }
      return completeLogin(user, user.passwordHash ? 'password' : 'google', client);
    },

    async loginWithGoogle(input: { idToken: string; dateOfBirth?: string }, client: ClientInfo): Promise<LoginResult> {
      if (!ctx.verifyGoogleIdToken) throw notConfigured('Google sign-in');
      const identity = await ctx.verifyGoogleIdToken(input.idToken).catch(() => {
        throw unauthenticated('Google sign-in could not be verified');
      });
      if (!identity.emailVerified) throw badRequest('Your Google email address is not verified');
      const email = identity.email.toLowerCase();

      let user = await User.findOne({ googleSub: identity.sub }).select(MFA_SELECT);
      if (!user) {
        user = await User.findOne({ email }).select(MFA_SELECT);
        if (user) {
          // Pre-hijack defence: an unverified password on this email may belong to someone else.
          if (!user.emailVerifiedAt && user.passwordHash) {
            user.passwordHash = null;
            await Session.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date(), revokeReason: 'google_link' });
          }
          user.googleSub = identity.sub;
          user.emailVerifiedAt ??= new Date();
          await user.save();
        } else {
          if (!input.dateOfBirth) {
            throw badRequest('Tell us your date of birth to finish signing up', [{ path: 'dateOfBirth', message: 'Required' }]);
          }
          assertAge(input.dateOfBirth);
          user = await User.create({
            email,
            googleSub: identity.sub,
            emailVerifiedAt: new Date(),
            dateOfBirth: input.dateOfBirth,
            termsAcceptedAt: new Date(),
          });
        }
      }
      assertCanSignIn(user);
      if (user.mfa?.enabled) return { status: 'mfa_required', mfaToken: await jwt.signMfa(user.id) };
      return completeLogin(user, 'google', client);
    },

    async refresh(token: string, client: ClientInfo): Promise<AuthSuccess> {
      const hash = sha256(token);
      const session = await Session.findOne({ refreshHash: hash });
      if (!session) {
        const replayed = await Session.findOne({ 'retired.hash': hash });
        if (replayed && !replayed.revokedAt) {
          const entry = replayed.retired.find((r) => r.hash === hash);
          if (entry?.at && Date.now() - entry.at.getTime() < REFRESH_RACE_GRACE_MS) {
            throw conflict('A refresh is already in progress');
          }
          replayed.revokedAt = new Date();
          replayed.revokeReason = 'refresh_reuse';
          await replayed.save();
          await logEvent(replayed.userId, 'refresh_reuse_detected', client, 'refresh');
          ctx.logger.warn({ sessionId: replayed.id, userId: String(replayed.userId) }, 'Refresh token reuse detected');
        }
        throw unauthenticated('This session has ended', 'SESSION_REVOKED');
      }
      if (session.revokedAt || session.expiresAt < new Date()) throw unauthenticated('This session has ended', 'SESSION_REVOKED');

      const user = await User.findById(session.userId);
      if (!user) throw unauthenticated('This session has ended', 'SESSION_REVOKED');
      if (user.status === 'suspended' || user.status === 'banned') {
        await Session.updateOne({ _id: session._id }, { revokedAt: new Date(), revokeReason: 'suspended' });
        assertCanSignIn(user);
      }

      const next = randomToken(32);
      const now = new Date();
      const updated = await Session.findOneAndUpdate(
        { _id: session._id, refreshHash: hash, revokedAt: null },
        {
          $set: { refreshHash: sha256(next), lastUsedAt: now, ip: client.ip },
          $push: { retired: { $each: [{ hash, at: now }], $slice: -10 } },
        },
        { new: true },
      );
      if (!updated) throw conflict('A refresh is already in progress');
      user.lastActiveAt = now;
      await user.save();
      const access = await jwt.signAccess({ sub: user.id, sid: updated.id, role: user.role });
      return {
        status: 'authenticated',
        accessToken: access.token,
        accessTokenExpiresAt: access.expiresAt.toISOString(),
        refreshToken: next,
        user: await buildMe(user),
      };
    },

    /** Revokes the session that owns this refresh token, if any. Idempotent. */
    async logoutByRefresh(token: string, client: ClientInfo) {
      const session = await Session.findOneAndUpdate(
        { refreshHash: sha256(token), revokedAt: null },
        { revokedAt: new Date(), revokeReason: 'logout' },
      );
      if (session) await logEvent(session.userId, 'logout', client);
    },

    async logoutSession(userId: string, sessionId: string, client: ClientInfo) {
      const res = await Session.updateOne({ _id: sessionId, userId, revokedAt: null }, { revokedAt: new Date(), revokeReason: 'logout' });
      if (res.modifiedCount) await logEvent(userId, 'logout', client);
    },

    async logoutAll(userId: string, client: ClientInfo, exceptSessionId?: string) {
      await Session.updateMany(
        { userId, revokedAt: null, ...(exceptSessionId ? { _id: { $ne: exceptSessionId } } : {}) },
        { revokedAt: new Date(), revokeReason: 'logout_all' },
      );
      await logEvent(userId, 'session_revoked', client);
    },

    async listSessions(userId: string) {
      return Session.find({ userId, revokedAt: null, expiresAt: { $gt: new Date() } })
        .sort({ lastUsedAt: -1 })
        .limit(limits.sessionsPerUser)
        .lean();
    },

    async revokeSession(userId: string, sessionId: string, client: ClientInfo) {
      const res = await Session.updateOne({ _id: sessionId, userId, revokedAt: null }, { revokedAt: new Date(), revokeReason: 'revoked_by_user' });
      if (!res.matchedCount) throw notFound('Session not found');
      await logEvent(userId, 'session_revoked', client);
    },

    async loginActivity(userId: string, limit: number, filter: Record<string, unknown>) {
      return LoginEvent.find({ userId, ...filter }).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean();
    },

    async verifyEmail(token: string) {
      const doc = await consumeToken(token, 'verify_email');
      await User.updateOne({ _id: doc.userId, emailVerifiedAt: null }, { emailVerifiedAt: new Date() });
    },

    async resendVerification(email: string) {
      const user = await User.findOne({ email });
      if (!user || user.emailVerifiedAt) return;
      const recent = await AuthToken.exists({ userId: user._id, purpose: 'verify_email', createdAt: { $gt: new Date(Date.now() - 60_000) } });
      if (recent) return;
      await sendVerification(user);
    },

    async forgotPassword(email: string) {
      const user = await User.findOne({ email });
      if (!user || user.status === 'banned') return;
      const token = await createToken(user._id, 'reset_password', RESET_TTL_MS);
      const url = `${env.APP_URL}/reset-password?token=${token}`;
      await mailer.send({
        to: user.email,
        subject: `Reset your ${brandName} password`,
        ...renderEmail(brandName, 'Reset your password', 'Someone asked to reset the password for this account. If that was you, use the button below within one hour. If not, you can ignore this email.', { label: 'Choose a new password', url }),
      });
    },

    async resetPassword(token: string, password: string, client: ClientInfo) {
      const doc = await consumeToken(token, 'reset_password');
      const user = await User.findById(doc.userId);
      if (!user) throw badRequest('This link is invalid or has expired. Request a new one.');
      user.passwordHash = await hashPassword(password);
      user.passwordChangedAt = new Date();
      user.failedLoginCount = 0;
      user.lockedUntil = null;
      user.emailVerifiedAt ??= new Date();
      await user.save();
      await AuthToken.deleteMany({ userId: user._id, purpose: 'reset_password', usedAt: null });
      await Session.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date(), revokeReason: 'password_reset' });
      await logEvent(user._id, 'password_reset', client);
    },

    async changePassword(userId: string, sessionId: string, input: { currentPassword?: string; newPassword: string }, client: ClientInfo) {
      const user = await loadForSecurity(userId);
      if (user.passwordHash && (!input.currentPassword || !(await verifyPassword(user.passwordHash, input.currentPassword)))) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Your current password is incorrect');
      }
      user.passwordHash = await hashPassword(input.newPassword);
      user.passwordChangedAt = new Date();
      await user.save();
      await Session.updateMany({ userId, revokedAt: null, _id: { $ne: sessionId } }, { revokedAt: new Date(), revokeReason: 'password_changed' });
      await logEvent(userId, 'password_changed', client);
    },

    async mfaSetup(userId: string): Promise<MfaSetupDto> {
      const user = await loadForSecurity(userId);
      if (user.mfa?.enabled) throw conflict('Two-factor authentication is already on');
      const secret = newTotpSecret();
      user.set('mfa.pendingSecretEnc', encryptSecret(secret, env.MFA_ENCRYPTION_KEY));
      await user.save();
      return { secret, otpauthUrl: otpauthUrl(user.username ?? user.email, brandName, secret) };
    },

    async mfaEnable(userId: string, code: string, client: ClientInfo) {
      const user = await loadForSecurity(userId);
      const pending = user.mfa?.pendingSecretEnc;
      if (!pending) throw badRequest('Start two-factor setup first');
      const step = matchTotp(code, pending, env.MFA_ENCRYPTION_KEY, 0);
      if (step === null) throw new AppError(401, 'MFA_INVALID', 'That code is not valid');
      const codes = generateRecoveryCodes();
      user.set('mfa', { enabled: true, secretEnc: pending, pendingSecretEnc: null, recoveryCodeHashes: codes.hashes, lastUsedStep: step });
      await user.save();
      await logEvent(userId, 'mfa_enabled', client);
      return { recoveryCodes: codes.plain };
    },

    async mfaDisable(userId: string, input: { code: string; password?: string }, client: ClientInfo) {
      const user = await loadForSecurity(userId);
      if (!user.mfa?.enabled) throw conflict('Two-factor authentication is already off');
      if (user.passwordHash && (!input.password || !(await verifyPassword(user.passwordHash, input.password)))) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Your password is incorrect');
      }
      if (!consumeSecondFactor(user, input.code)) throw new AppError(401, 'MFA_INVALID', 'That code is not valid');
      user.set('mfa', { enabled: false, secretEnc: null, pendingSecretEnc: null, recoveryCodeHashes: [], lastUsedStep: 0 });
      await user.save();
      await logEvent(userId, 'mfa_disabled', client);
    },

    async regenerateRecoveryCodes(userId: string, code: string) {
      const user = await loadForSecurity(userId);
      if (!consumeSecondFactor(user, code)) throw new AppError(401, 'MFA_INVALID', 'That code is not valid');
      const codes = generateRecoveryCodes();
      user.set('mfa.recoveryCodeHashes', codes.hashes);
      await user.save();
      return { recoveryCodes: codes.plain };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;

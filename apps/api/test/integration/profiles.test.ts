import { describe, expect, it } from 'vitest';
import { harness } from './harness.js';
import { User } from '../../src/modules/users/user.model.js';
import { Profile } from '../../src/modules/profiles/profile.model.js';

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

describe('usernames', () => {
  it('checks availability with suggestions and blocks reserved names', async () => {
    const h = harness();
    await h.onboardedUser('a@example.com', 'nova');
    const taken = await h.http().get('/api/v1/auth/username-availability?username=Nova');
    expect(taken.body).toMatchObject({ username: 'nova', available: false });
    expect(taken.body.suggestions.length).toBeGreaterThan(0);
    expect((await h.http().get('/api/v1/auth/username-availability?username=admin')).body.available).toBe(false);
    expect((await h.http().get('/api/v1/auth/username-availability?username=fresh.name')).body.available).toBe(true);
  });

  it('requires a verified email to claim a username', async () => {
    const h = harness();
    const u = await h.register();
    const res = await h.http().put('/api/v1/me/username').set(bearer(u.access)).send({ username: 'nova' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('keeps usernames unique and renames both user and profile', async () => {
    const h = harness();
    const a = await h.onboardedUser('a@example.com', 'nova');
    const b = await h.onboardedUser('b@example.com', 'lime');
    expect((await h.http().put('/api/v1/me/username').set(bearer(b.access)).send({ username: 'nova' })).status).toBe(409);
    const renamed = await h.http().put('/api/v1/me/username').set(bearer(a.access)).send({ username: 'nova.new' });
    expect(renamed.body.username).toBe('nova.new');
    expect(renamed.body.profile.username).toBe('nova.new');
    expect((await h.http().get('/api/v1/users/nova')).status).toBe(404);
  });

  it('makes accounts for under-18s private by default', async () => {
    const h = harness();
    const dob = new Date(Date.now() - 15 * 365.25 * 24 * 3600_000).toISOString().slice(0, 10);
    const res = await h.http().post('/api/v1/auth/register').send({ email: 'teen@example.com', password: 'electric lime 42', dateOfBirth: dob, acceptTerms: true, platform: 'ios' });
    await h.verify();
    const me = await h.http().put('/api/v1/me/username').set(bearer(res.body.accessToken)).send({ username: 'teen_user' });
    expect(me.body.profile.isPrivate).toBe(true);
  });
});

describe('profile editing and onboarding', () => {
  it('edits profile fields with validation and completes onboarding', async () => {
    const h = harness();
    const u = await h.onboardedUser();
    const edit = await h.http().patch('/api/v1/me/profile').set(bearer(u.access))
      .send({ displayName: 'Nova Lime', bio: 'Making things glow', website: 'nova.example', accountType: 'creator' });
    expect(edit.status).toBe(200);
    expect(edit.body).toMatchObject({ displayName: 'Nova Lime', website: 'https://nova.example', accountType: 'creator' });

    expect((await h.http().patch('/api/v1/me/profile').set(bearer(u.access)).send({ bio: 'x'.repeat(200) })).status).toBe(400);
    expect((await h.http().patch('/api/v1/me/profile').set(bearer(u.access)).send({ role: 'admin' })).status).toBe(400);

    const interests = await h.http().put('/api/v1/me/interests').set(bearer(u.access)).send({ interests: ['music', 'art'] });
    expect(interests.body.interests).toEqual(['music', 'art']);
    const done = await h.http().post('/api/v1/me/onboarding/complete').set(bearer(u.access));
    expect(done.body.onboardingCompleted).toBe(true);
  });

  it('public profile hides private data and respects privacy', async () => {
    const h = harness();
    const owner = await h.onboardedUser('a@example.com', 'nova');
    const viewer = await h.onboardedUser('b@example.com', 'lime');
    const pub = await h.http().get('/api/v1/users/nova');
    expect(pub.status).toBe(200);
    expect(pub.body.email).toBeUndefined();
    expect(pub.body.viewer).toMatchObject({ isSelf: false, canViewContent: true, relationship: null });

    await h.http().patch('/api/v1/me/profile').set(bearer(owner.access)).send({ isPrivate: true });
    const asViewer = await h.http().get('/api/v1/users/nova').set(bearer(viewer.access));
    expect(asViewer.body.viewer.canViewContent).toBe(false);
    const asSelf = await h.http().get('/api/v1/users/nova').set(bearer(owner.access));
    expect(asSelf.body.viewer).toMatchObject({ isSelf: true, canViewContent: true });
  });

  it('cannot change role through any profile or settings endpoint', async () => {
    const h = harness();
    const u = await h.onboardedUser();
    await h.http().patch('/api/v1/me/settings').set(bearer(u.access)).send({ role: 'admin' });
    const user = await User.findOne({ email: 'nova@example.com' }).lean();
    expect(user!.role).toBe('user');
  });
});

describe('settings', () => {
  it('reads defaults and patches nested values without losing others', async () => {
    const h = harness();
    const u = await h.register();
    const defaults = await h.http().get('/api/v1/me/settings').set(bearer(u.access));
    expect(defaults.body.theme).toBe('system');
    const patched = await h.http().patch('/api/v1/me/settings').set(bearer(u.access))
      .send({ theme: 'dark', timezone: 'Asia/Kolkata', privacy: { allowMessagesFrom: 'following' }, notifications: { likes: false } });
    expect(patched.status).toBe(200);
    expect(patched.body).toMatchObject({ theme: 'dark', timezone: 'Asia/Kolkata' });
    expect(patched.body.privacy).toMatchObject({ allowMessagesFrom: 'following', allowMentionsFrom: 'everyone' });
    expect(patched.body.notifications).toMatchObject({ likes: false, comments: true });
    expect((await h.http().patch('/api/v1/me/settings').set(bearer(u.access)).send({ timezone: 'Mars/Olympus' })).status).toBe(400);
  });
});

describe('deactivation, deletion and export', () => {
  it('deactivation hides the profile and signs out; login reactivates', async () => {
    const h = harness();
    const u = await h.onboardedUser();
    expect((await h.http().post('/api/v1/me/deactivate').set(bearer(u.access)).send({ password: 'wrong pass 1' })).status).toBe(401);
    expect((await h.http().post('/api/v1/me/deactivate').set(bearer(u.access)).send({ password: u.password })).status).toBe(200);
    expect((await h.http().get('/api/v1/users/nova')).status).toBe(404);
    expect((await h.http().get('/api/v1/me').set(bearer(u.access))).status).toBe(401);
    const login = await h.http().post('/api/v1/auth/login').send({ identifier: 'nova', password: u.password, platform: 'ios' });
    expect(login.body.user.status).toBe('active');
    expect((await h.http().get('/api/v1/users/nova')).status).toBe(200);
  });

  it('schedules deletion with a grace period, can be cancelled, and purge removes data', async () => {
    const h = harness();
    const u = await h.onboardedUser();
    const del = await h.http().post('/api/v1/me/deletion').set(bearer(u.access)).send({ password: u.password });
    expect(del.status).toBe(202);
    const days = (new Date(del.body.deletionScheduledFor).getTime() - Date.now()) / 86_400_000;
    expect(Math.round(days)).toBe(30);

    const login = await h.http().post('/api/v1/auth/login').send({ identifier: 'nova@example.com', password: u.password, platform: 'ios' });
    expect(login.body.user.status).toBe('pending_deletion');
    const cancel = await h.http().delete('/api/v1/me/deletion').set(bearer(login.body.accessToken));
    expect(cancel.body.status).toBe('active');

    await h.http().post('/api/v1/me/deletion').set(bearer(login.body.accessToken)).send({ password: u.password });
    const { purgeDueAccounts } = await import('../../src/modules/users/users.service.js');
    expect(await purgeDueAccounts(new Date(Date.now() + 31 * 86_400_000))).toBe(1);
    expect(await User.countDocuments()).toBe(0);
    expect(await Profile.countDocuments()).toBe(0);
  });

  it('exports the account data without secrets', async () => {
    const h = harness();
    const u = await h.onboardedUser();
    const res = await h.http().get('/api/v1/me/export').set(bearer(u.access));
    expect(res.status).toBe(200);
    expect(res.body.account.email).toBe('nova@example.com');
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/argon2|passwordHash|refreshHash|secretEnc/);
  });
});

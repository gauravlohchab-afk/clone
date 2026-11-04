import { describe, expect, it } from 'vitest';
import { harness } from './harness.js';
import { Profile } from '../../src/modules/profiles/profile.model.js';

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

async function three() {
  const h = harness();
  const a = await h.onboardedUser('a@example.com', 'ava');
  const b = await h.onboardedUser('b@example.com', 'ben');
  const c = await h.onboardedUser('c@example.com', 'cam');
  return { h, a, b, c };
}
const counts = async (username: string) => (await Profile.findOne({ username }).lean())!.counts;

describe('follow / unfollow', () => {
  it('follows a public account, updates counts, and is idempotent', async () => {
    const { h, a } = await three();
    const r1 = await h.http().post('/api/v1/users/ben/follow').set(bearer(a.access));
    expect(r1.status).toBe(200);
    expect(r1.body).toMatchObject({ status: 'following', counts: { followers: 1 } });
    await h.http().post('/api/v1/users/ben/follow').set(bearer(a.access));
    expect(await counts('ben')).toMatchObject({ followers: 1 });
    expect(await counts('ava')).toMatchObject({ following: 1 });

    const prof = await h.http().get('/api/v1/users/ava').set(bearer(a.access));
    expect(prof.body.counts.following).toBe(1);

    const un = await h.http().delete('/api/v1/users/ben/follow').set(bearer(a.access));
    expect(un.body.status).toBe('not_following');
    expect(await counts('ben')).toMatchObject({ followers: 0 });
    await h.http().delete('/api/v1/users/ben/follow').set(bearer(a.access));
    expect(await counts('ben')).toMatchObject({ followers: 0 });
  });

  it('cannot follow yourself and requires a verified email', async () => {
    const { h, a } = await three();
    expect((await h.http().post('/api/v1/users/ava/follow').set(bearer(a.access))).status).toBe(400);
    const fresh = await h.register('d@example.com');
    const res = await h.http().post('/api/v1/users/ben/follow').set(bearer(fresh.access));
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('shows relationship state on profiles', async () => {
    const { h, a, b } = await three();
    await h.http().post('/api/v1/users/ben/follow').set(bearer(a.access));
    const asBen = await h.http().get('/api/v1/users/ava').set(bearer(b.access));
    expect(asBen.body.viewer.relationship).toMatchObject({ following: false, followedBy: true });
  });
});

describe('private accounts and follow requests', () => {
  it('creates a request, hides content until approved, then lets the follower in', async () => {
    const { h, a, b } = await three();
    await h.http().patch('/api/v1/me/profile').set(bearer(b.access)).send({ isPrivate: true });
    const req = await h.http().post('/api/v1/users/ben/follow').set(bearer(a.access));
    expect(req.body.status).toBe('requested');
    expect(await counts('ben')).toMatchObject({ followers: 0 });
    expect((await h.http().get('/api/v1/users/ben/followers').set(bearer(a.access))).status).toBe(403);

    const inbox = await h.http().get('/api/v1/me/follow-requests').set(bearer(b.access));
    expect(inbox.body.items).toHaveLength(1);
    expect(inbox.body.items[0].from.username).toBe('ava');
    // Someone else cannot approve Ben's request.
    expect((await h.http().post(`/api/v1/me/follow-requests/${inbox.body.items[0].id}/approve`).set(bearer(a.access))).status).toBe(404);

    const ok = await h.http().post(`/api/v1/me/follow-requests/${inbox.body.items[0].id}/approve`).set(bearer(b.access));
    expect(ok.body.counts.followers).toBe(1);
    const prof = await h.http().get('/api/v1/users/ben').set(bearer(a.access));
    expect(prof.body.viewer).toMatchObject({ canViewContent: true, relationship: { following: true } });
    expect((await h.http().get('/api/v1/users/ben/followers').set(bearer(a.access))).status).toBe(200);
  });

  it('declines and cancels requests', async () => {
    const { h, a, b, c } = await three();
    await h.http().patch('/api/v1/me/profile').set(bearer(b.access)).send({ isPrivate: true });
    await h.http().post('/api/v1/users/ben/follow').set(bearer(a.access));
    await h.http().post('/api/v1/users/ben/follow').set(bearer(c.access));
    const inbox = await h.http().get('/api/v1/me/follow-requests').set(bearer(b.access));
    const fromCam = inbox.body.items.find((i: { from: { username: string } }) => i.from.username === 'cam');
    expect((await h.http().delete(`/api/v1/me/follow-requests/${fromCam.id}`).set(bearer(b.access))).status).toBe(204);
    const cancel = await h.http().delete('/api/v1/users/ben/follow').set(bearer(a.access));
    expect(cancel.body.status).toBe('not_following');
    expect((await h.http().get('/api/v1/me/follow-requests').set(bearer(b.access))).body.items).toHaveLength(0);
  });

  it('going public approves pending requests', async () => {
    const { h, a, b } = await three();
    await h.http().patch('/api/v1/me/profile').set(bearer(b.access)).send({ isPrivate: true });
    await h.http().post('/api/v1/users/ben/follow').set(bearer(a.access));
    const pub = await h.http().patch('/api/v1/me/profile').set(bearer(b.access)).send({ isPrivate: false });
    expect(pub.body.counts.followers).toBe(1);
  });
});

describe('lists', () => {
  it('lists followers and following with pagination and viewer state, and mutuals', async () => {
    const { h, a, b, c } = await three();
    await h.http().post('/api/v1/users/cam/follow').set(bearer(a.access));
    await h.http().post('/api/v1/users/cam/follow').set(bearer(b.access));
    await h.http().post('/api/v1/users/ben/follow').set(bearer(a.access));

    const p1 = await h.http().get('/api/v1/users/cam/followers?limit=1').set(bearer(a.access));
    expect(p1.body.items).toHaveLength(1);
    expect(p1.body.nextCursor).toBeTruthy();
    const p2 = await h.http().get(`/api/v1/users/cam/followers?limit=1&cursor=${p1.body.nextCursor}`).set(bearer(a.access));
    expect(p2.body.items).toHaveLength(1);
    expect(p2.body.nextCursor).toBeNull();
    const names = [p1.body.items[0].username, p2.body.items[0].username].sort();
    expect(names).toEqual(['ava', 'ben']);
    const benRow = [...p1.body.items, ...p2.body.items].find((i: { username: string }) => i.username === 'ben');
    expect(benRow.relationship).toMatchObject({ following: true });

    const following = await h.http().get('/api/v1/users/ava/following');
    expect(following.body.items.map((i: { username: string }) => i.username).sort()).toEqual(['ben', 'cam']);

    // Ava follows Ben, and Ben follows Cam: Ben is a mutual for Ava viewing Cam.
    const mutuals = await h.http().get('/api/v1/users/cam/mutuals').set(bearer(a.access));
    expect(mutuals.body.total).toBe(1);
    expect(mutuals.body.items[0].username).toBe('ben');
    void c;
  });

  it('removes a follower', async () => {
    const { h, a, b } = await three();
    await h.http().post('/api/v1/users/ben/follow').set(bearer(a.access));
    const res = await h.http().delete('/api/v1/users/ava/follower').set(bearer(b.access));
    expect(res.body.counts.followers).toBe(0);
    expect(await counts('ava')).toMatchObject({ following: 0 });
  });

  it('suggests accounts by shared interests, excluding followed ones', async () => {
    const { h, a, b, c } = await three();
    await h.http().put('/api/v1/me/interests').set(bearer(a.access)).send({ interests: ['music'] });
    await h.http().put('/api/v1/me/interests').set(bearer(b.access)).send({ interests: ['music'] });
    await h.http().put('/api/v1/me/interests').set(bearer(c.access)).send({ interests: ['food'] });
    const s1 = await h.http().get('/api/v1/me/suggestions').set(bearer(a.access));
    expect(s1.body.items.map((i: { username: string }) => i.username)).toEqual(['ben', 'cam']);
    await h.http().post('/api/v1/users/ben/follow').set(bearer(a.access));
    const s2 = await h.http().get('/api/v1/me/suggestions').set(bearer(a.access));
    expect(s2.body.items.map((i: { username: string }) => i.username)).toEqual(['cam']);
  });
});

describe('block, restrict, mute', () => {
  it('blocking removes follows both ways, hides the blocker, and prevents following', async () => {
    const { h, a, b } = await three();
    await h.http().post('/api/v1/users/ben/follow').set(bearer(a.access));
    await h.http().post('/api/v1/users/ava/follow').set(bearer(b.access));
    const blk = await h.http().post('/api/v1/users/ben/block').set(bearer(a.access));
    expect(blk.body).toMatchObject({ blocking: true, following: false, followedBy: false });
    expect(await counts('ava')).toMatchObject({ followers: 0, following: 0 });
    expect(await counts('ben')).toMatchObject({ followers: 0, following: 0 });

    // Ben cannot see or follow Ava; Ava still sees Ben (to unblock) but not his content.
    expect((await h.http().get('/api/v1/users/ava').set(bearer(b.access))).status).toBe(404);
    expect((await h.http().post('/api/v1/users/ava/follow').set(bearer(b.access))).status).toBe(404);
    const asAva = await h.http().get('/api/v1/users/ben').set(bearer(a.access));
    expect(asAva.body.viewer).toMatchObject({ canViewContent: false, relationship: { blocking: true } });
    expect((await h.http().post('/api/v1/users/ben/follow').set(bearer(a.access))).status).toBe(403);

    // Blocked accounts disappear from lists.
    await h.http().post('/api/v1/users/cam/follow').set(bearer(b.access));
    const camFollowers = await h.http().get('/api/v1/users/cam/followers').set(bearer(a.access));
    expect(camFollowers.body.items.map((i: { username: string }) => i.username)).not.toContain('ben');

    const list = await h.http().get('/api/v1/me/blocked').set(bearer(a.access));
    expect(list.body.items.map((i: { username: string }) => i.username)).toEqual(['ben']);
    const un = await h.http().delete('/api/v1/users/ben/block').set(bearer(a.access));
    expect(un.body.blocking).toBe(false);
    expect((await h.http().get('/api/v1/users/ava').set(bearer(b.access))).status).toBe(200);
  });

  it('restricts and mutes with lists, without telling the other account', async () => {
    const { h, a, b } = await three();
    expect((await h.http().post('/api/v1/users/ben/restrict').set(bearer(a.access))).body.restricting).toBe(true);
    const m = await h.http().post('/api/v1/users/ben/mute').set(bearer(a.access)).send({ posts: true, stories: false });
    expect(m.body.muting).toEqual({ posts: true, stories: false });
    expect((await h.http().post('/api/v1/users/ben/mute').set(bearer(a.access)).send({ posts: false, stories: false })).status).toBe(400);

    expect((await h.http().get('/api/v1/me/restricted').set(bearer(a.access))).body.items[0].username).toBe('ben');
    expect((await h.http().get('/api/v1/me/muted').set(bearer(a.access))).body.items[0].muting).toEqual({ posts: true, stories: false });
    const asBen = await h.http().get('/api/v1/users/ava').set(bearer(b.access));
    expect(asBen.body.viewer.relationship).toMatchObject({ restricting: false, muting: null, blocking: false });

    await h.http().delete('/api/v1/users/ben/restrict').set(bearer(a.access));
    await h.http().delete('/api/v1/users/ben/mute').set(bearer(a.access));
    expect((await h.http().get('/api/v1/me/muted').set(bearer(a.access))).body.items).toHaveLength(0);
  });

  it('account purge cleans edges and fixes counts', async () => {
    const { h, a, b } = await three();
    await h.http().post('/api/v1/users/ben/follow').set(bearer(a.access));
    await h.http().post('/api/v1/me/deletion').set(bearer(a.access)).send({ password: a.password });
    const { purgeDueAccounts } = await import('../../src/modules/users/users.service.js');
    await purgeDueAccounts(new Date(Date.now() + 31 * 86_400_000));
    expect(await counts('ben')).toMatchObject({ followers: 0 });
    void b;
  });
});

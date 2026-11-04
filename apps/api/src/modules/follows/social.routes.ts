import { Router, type Request } from 'express';
import { muteSchema, objectId, paginationQuery } from '@vyro/validation';
import { z } from 'zod';
import type { AppContext } from '../../context.js';
import { authenticate, requireVerifiedEmail } from '../../middleware/auth.js';
import { limiter } from '../../middleware/rate-limit.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { badRequest } from '../../lib/errors.js';
import * as follows from './follows.service.js';
import * as safety from '../relationships/safety.service.js';

const uname = (req: Request) => {
  const u = String(req.params.username);
  if (!/^[a-z0-9._]{1,30}$/i.test(u)) throw badRequest('Invalid username');
  return u;
};
const page = (res: { locals: Record<string, unknown> }) => res.locals.query as { limit: number; cursor?: string };

/** Relationship routes on other users: /api/v1/users/:username/... */
export function userSocialRoutes(ctx: AppContext) {
  const r = Router();
  const requireAuth = authenticate(ctx, { required: true });
  const optionalAuth = authenticate(ctx, { required: false });
  const followLimiter = limiter(ctx, 'follow', { windowMs: 3600_000, limit: 200 });
  const safetyLimiter = limiter(ctx, 'safety', { windowMs: 60_000, limit: 60 });
  const uid = (req: Request) => req.auth!.userId;

  r.post('/:username/follow', requireAuth, requireVerifiedEmail, followLimiter, async (req, res) => res.json(await follows.follow(uid(req), uname(req))));
  r.delete('/:username/follow', requireAuth, async (req, res) => res.json(await follows.unfollow(uid(req), uname(req))));
  r.delete('/:username/follower', requireAuth, async (req, res) => res.json(await follows.removeFollower(uid(req), uname(req))));

  r.get('/:username/followers', optionalAuth, validateQuery(paginationQuery), async (req, res) =>
    res.json(await follows.listConnections(uname(req), 'followers', req.auth?.userId, page(res).limit, page(res).cursor)));
  r.get('/:username/following', optionalAuth, validateQuery(paginationQuery), async (req, res) =>
    res.json(await follows.listConnections(uname(req), 'following', req.auth?.userId, page(res).limit, page(res).cursor)));
  r.get('/:username/mutuals', requireAuth, validateQuery(paginationQuery), async (req, res) =>
    res.json(await follows.mutualFollowers(uname(req), uid(req), page(res).limit)));

  r.post('/:username/block', requireAuth, safetyLimiter, async (req, res) => res.json(await safety.block(uid(req), uname(req))));
  r.delete('/:username/block', requireAuth, safetyLimiter, async (req, res) => res.json(await safety.unblock(uid(req), uname(req))));
  r.post('/:username/restrict', requireAuth, safetyLimiter, async (req, res) => res.json(await safety.restrict(uid(req), uname(req))));
  r.delete('/:username/restrict', requireAuth, safetyLimiter, async (req, res) => res.json(await safety.unrestrict(uid(req), uname(req))));
  r.post('/:username/mute', requireAuth, safetyLimiter, validateBody(muteSchema), async (req, res) => res.json(await safety.mute(uid(req), uname(req), req.body)));
  r.delete('/:username/mute', requireAuth, safetyLimiter, async (req, res) => res.json(await safety.unmute(uid(req), uname(req))));
  return r;
}

/** The signed-in user's own social inbox and lists: /api/v1/me/... */
export function meSocialRoutes(ctx: AppContext) {
  const r = Router();
  const auth = authenticate(ctx, { required: true });
  const uid = (req: Request) => req.auth!.userId;
  const idParam = (req: Request) => objectId.parse(req.params.id);

  r.get('/follow-requests', auth, validateQuery(paginationQuery), async (req, res) =>
    res.json(await follows.listIncomingRequests(uid(req), page(res).limit, page(res).cursor)));
  r.post('/follow-requests/:id/approve', auth, async (req, res) => res.json(await follows.approveRequest(uid(req), idParam(req))));
  r.delete('/follow-requests/:id', auth, async (req, res) => {
    await follows.declineRequest(uid(req), idParam(req));
    res.status(204).end();
  });
  r.get('/suggestions', auth, validateQuery(z.object({ limit: z.coerce.number().int().min(1).max(30).default(12) })), async (req, res) =>
    res.json({ items: await follows.suggestions(uid(req), (res.locals.query as { limit: number }).limit) }));
  for (const kind of ['blocked', 'restricted', 'muted'] as const) {
    r.get(`/${kind}`, auth, validateQuery(paginationQuery), async (req, res) => res.json(await safety.listSafety(uid(req), kind, page(res).limit, page(res).cursor)));
  }
  return r;
}

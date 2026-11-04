import { Router } from 'express';
import type { AppContext } from '../../context.js';
import { authenticate } from '../../middleware/auth.js';
import { limiter } from '../../middleware/rate-limit.js';
import { badRequest } from '../../lib/errors.js';
import { getPublicProfile } from './profiles.service.js';

/** Public profile reads: /api/v1/users/:username */
export function profileRoutes(ctx: AppContext) {
  const r = Router();
  r.get('/:username', limiter(ctx, 'profile-read', { windowMs: 60_000, limit: 120 }), authenticate(ctx, { required: false }), async (req, res) => {
    const username = String(req.params.username);
    if (!/^[a-z0-9._]{1,30}$/i.test(username)) throw badRequest('Invalid username');
    res.json(await getPublicProfile(username, req.auth?.userId));
  });
  return r;
}

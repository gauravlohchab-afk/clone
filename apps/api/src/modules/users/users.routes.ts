import { Router, type Request, type Response } from 'express';
import { confirmWithPasswordSchema, interestsSchema, setUsernameSchema, updateProfileSchema, updateSettingsSchema } from '@vyro/validation';
import type { AppContext } from '../../context.js';
import { authenticate } from '../../middleware/auth.js';
import { limiter } from '../../middleware/rate-limit.js';
import { validateBody } from '../../middleware/validate.js';
import { createAuthService } from '../auth/auth.service.js';
import { REFRESH_COOKIE } from '../auth/auth.controller.js';
import * as users from './users.service.js';

/** Routes for the signed-in user's own account: /api/v1/me */
export function meRoutes(ctx: AppContext) {
  const r = Router();
  const auth = createAuthService(ctx);
  r.use(authenticate(ctx, { required: true }));
  const uid = (req: Request) => req.auth!.userId;
  const writeLimiter = limiter(ctx, 'me-write', { windowMs: 60_000, limit: 30 });

  r.get('/', async (req, res) => res.json(await users.getMe(uid(req))));
  r.put('/username', writeLimiter, validateBody(setUsernameSchema), async (req, res) =>
    res.json(await users.setUsername(uid(req), req.body.username)),
  );
  r.patch('/profile', writeLimiter, validateBody(updateProfileSchema), async (req, res) =>
    res.json(await users.updateProfile(uid(req), req.body)),
  );
  r.put('/interests', writeLimiter, validateBody(interestsSchema), async (req, res) =>
    res.json(await users.setInterests(uid(req), req.body.interests)),
  );
  r.post('/onboarding/complete', async (req, res) => res.json(await users.completeOnboarding(uid(req))));
  r.get('/settings', async (req, res) => res.json(await users.getSettings(uid(req))));
  r.patch('/settings', writeLimiter, validateBody(updateSettingsSchema), async (req, res) =>
    res.json(await users.updateSettings(uid(req), req.body)),
  );

  const clearCookies = (res: Response) => res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });

  r.post('/deactivate', writeLimiter, validateBody(confirmWithPasswordSchema), async (req, res) => {
    const user = await auth.loadForSecurity(uid(req));
    await auth.confirmIdentity(user, req.body);
    await users.deactivate(user);
    clearCookies(res);
    res.json({ status: 'deactivated' });
  });
  r.post('/deletion', writeLimiter, validateBody(confirmWithPasswordSchema), async (req, res) => {
    const user = await auth.loadForSecurity(uid(req));
    await auth.confirmIdentity(user, req.body);
    const at = await users.scheduleDeletion(user);
    clearCookies(res);
    res.status(202).json({ status: 'pending_deletion', deletionScheduledFor: at.toISOString() });
  });
  r.delete('/deletion', async (req, res) => res.json(await users.cancelDeletion(uid(req))));
  r.get('/export', limiter(ctx, 'export', { windowMs: 3600_000, limit: 5 }), async (req, res) => {
    res.setHeader('Content-Disposition', 'attachment; filename="account-export.json"');
    res.json(await users.exportData(uid(req), req.auth!.sessionId));
  });
  return r;
}

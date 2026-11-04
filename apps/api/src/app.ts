import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import mongoose from 'mongoose';
import type { AppContext } from './context.js';
import { requestId } from './middleware/request-id.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { limiter } from './middleware/rate-limit.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { meRoutes } from './modules/users/users.routes.js';
import { profileRoutes } from './modules/profiles/profiles.routes.js';
import { meSocialRoutes, userSocialRoutes } from './modules/follows/social.routes.js';

export function createApp(ctx: AppContext) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', ctx.env.TRUST_PROXY);
  app.set('query parser', 'simple');

  app.use(requestId);
  if (ctx.env.NODE_ENV !== 'test') {
    app.use(pinoHttp({ logger: ctx.logger, genReqId: (req) => (req as express.Request).id, autoLogging: { ignore: (req) => req.url === '/health' } }));
  }
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } }, crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || ctx.env.corsOrigins.includes(origin)),
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Client-Platform', 'X-Request-Id'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/ready', async (_req, res) => {
    const mongo = mongoose.connection.readyState === 1;
    const redis = ctx.redis ? ctx.redis.status === 'ready' : null;
    const ok = mongo && redis !== false;
    res.status(ok ? 200 : 503).json({
      status: ok ? 'ready' : 'degraded',
      checks: { mongo, redis, mailer: ctx.mailer.kind, googleSignIn: !!ctx.verifyGoogleIdToken },
    });
  });

  const api = express.Router();
  api.use(limiter(ctx, 'global', { windowMs: 60_000, limit: 600 }));
  api.use('/auth', authRoutes(ctx));
  api.use('/me', meSocialRoutes(ctx));
  api.use('/me', meRoutes(ctx));
  api.use('/users', userSocialRoutes(ctx));
  api.use('/users', profileRoutes(ctx));
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler(ctx.logger));
  return app;
}

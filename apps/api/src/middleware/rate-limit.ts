import { rateLimit, type Options } from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import type { RequestHandler } from 'express';
import type { AppContext } from '../context.js';

/**
 * Rate limiter backed by Redis when configured (shared across instances),
 * otherwise in-process memory (single instance, development and tests).
 */
export function limiter(
  ctx: AppContext,
  name: string,
  opts: { windowMs: number; limit: number; keyBy?: 'ip' | 'ip+identifier' },
): RequestHandler {
  const redis = ctx.redis;
  const config: Partial<Options> = {
    windowMs: opts.windowMs,
    limit: opts.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again shortly.', requestId: req.id } });
    },
  };
  if (opts.keyBy === 'ip+identifier') {
    config.keyGenerator = (req) => {
      const id = String(req.body?.identifier ?? req.body?.email ?? '').toLowerCase().slice(0, 254);
      return `${req.ip}|${id}`;
    };
  }
  if (redis) {
    config.store = new RedisStore({
      prefix: `rl:${name}:`,
      sendCommand: (command: string, ...args: string[]) => redis.call(command, ...args) as Promise<RedisReply>,
    });
  }
  return rateLimit(config);
}

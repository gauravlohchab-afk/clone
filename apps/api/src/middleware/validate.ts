import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

/**
 * Parses and replaces req.body / validated query with the schema output.
 * Express 5 makes req.query a getter, so parsed query lives on res.locals.query.
 */
export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    req.body = schema.parse(req.body ?? {});
    next();
  };

export const validateQuery =
  (schema: ZodType): RequestHandler =>
  (req, res, next) => {
    res.locals.query = schema.parse(req.query);
    next();
  };

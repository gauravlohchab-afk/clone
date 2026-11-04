import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../lib/errors.js';
import type { Logger } from '../lib/logger.js';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found', requestId: req.id } });
};

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    const requestId = req.id;
    if (err instanceof AppError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details, requestId } });
      return;
    }
    if (err instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Some fields need attention',
          details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
          requestId,
        },
      });
      return;
    }
    if (err?.type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'Malformed JSON body', requestId } });
      return;
    }
    if (err?.type === 'entity.too.large') {
      res.status(413).json({ error: { code: 'VALIDATION_FAILED', message: 'Request body too large', requestId } });
      return;
    }
    if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'That value is already taken', requestId } });
      return;
    }
    logger.error({ err, requestId, path: req.path }, 'Unhandled error');
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong on our side', requestId } });
  };
}

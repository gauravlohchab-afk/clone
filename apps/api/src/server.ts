import mongoose from 'mongoose';
import { buildContext } from './bootstrap.js';
import { createApp } from './app.js';

const ctx = buildContext();
const { env, logger } = ctx;

mongoose.set('strictQuery', true);
mongoose.set('autoIndex', env.NODE_ENV !== 'production');
await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
logger.info('MongoDB connected');
if (ctx.mailer.kind === 'console') logger.warn('SMTP_URL not set: emails are written to this log (development only)');
if (!ctx.verifyGoogleIdToken) logger.warn('GOOGLE_CLIENT_IDS not set: Google sign-in is disabled');

const server = createApp(ctx).listen(env.PORT, () => logger.info(`API listening on :${env.PORT}`));

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down');
  server.close();
  await mongoose.disconnect();
  await ctx.redis?.quit();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (err) => logger.error({ err }, 'Unhandled rejection'));

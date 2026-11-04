import { Types } from 'mongoose';
import { badRequest } from './errors.js';

/** Opaque cursor over (createdAt desc, _id desc). */
export function encodeCursor(doc: { _id: Types.ObjectId; createdAt: Date }): string {
  return Buffer.from(`${doc.createdAt.getTime()}:${doc._id.toHexString()}`).toString('base64url');
}

export function decodeCursor(cursor: string | undefined) {
  if (!cursor) return null;
  const [ts, id] = Buffer.from(cursor, 'base64url').toString().split(':');
  const time = Number(ts);
  if (!id || !Types.ObjectId.isValid(id) || !Number.isFinite(time)) throw badRequest('Invalid cursor');
  return { createdAt: new Date(time), id: new Types.ObjectId(id) };
}

/** Mongo filter for "older than cursor" in (createdAt, _id) descending order. */
export function cursorFilter(cursor: string | undefined) {
  const c = decodeCursor(cursor);
  if (!c) return {};
  return { $or: [{ createdAt: { $lt: c.createdAt } }, { createdAt: c.createdAt, _id: { $lt: c.id } }] };
}

export function toPage<T extends { _id: Types.ObjectId; createdAt: Date }, R>(docs: T[], limit: number, map: (d: T) => R) {
  const hasMore = docs.length > limit;
  const items = hasMore ? docs.slice(0, limit) : docs;
  const last = items.at(-1);
  return { items: items.map(map), nextCursor: hasMore && last ? encodeCursor(last) : null };
}

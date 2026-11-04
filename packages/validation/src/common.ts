import { z } from 'zod';
import { limits, reservedUsernames } from '@vyro/config';

/** Strip control characters and trim. Applied to every free-text field. */
export const cleanText = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim())
    .pipe(z.string().max(max));

export const objectId = z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid id');

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email('Enter a valid email address'));

/**
 * Usernames: 3-30 chars, lowercase letters, digits, underscore and period;
 * no leading/trailing period and no consecutive periods. Stored lowercase.
 */
export const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(limits.username.min, `At least ${limits.username.min} characters`)
  .max(limits.username.max, `At most ${limits.username.max} characters`)
  .regex(/^[a-z0-9._]+$/, 'Use letters, numbers, periods and underscores only')
  .refine((u) => !u.startsWith('.') && !u.endsWith('.'), 'Cannot start or end with a period')
  .refine((u) => !u.includes('..'), 'Cannot contain consecutive periods')
  .refine((u) => !/^\d+$/.test(u), 'Cannot be only numbers')
  .refine((u) => !reservedUsernames.has(u), 'This username is not available');

export const password = z
  .string()
  .min(limits.password.min, `At least ${limits.password.min} characters`)
  .max(limits.password.max, `At most ${limits.password.max} characters`)
  .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), 'Use at least one letter and one number');

export const paginationQuery = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(limits.pagination.maxLimit)
    .default(limits.pagination.defaultLimit),
});

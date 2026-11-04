import { z } from 'zod';
import { interestCatalog, limits } from '@vyro/config';
import { cleanText } from './common.js';

const website = z
  .string()
  .trim()
  .max(limits.website.max)
  .refine((v) => {
    if (v === '') return true;
    try {
      const u = new URL(v.startsWith('http') ? v : `https://${v}`);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'Enter a valid URL')
  .transform((v) => (v === '' || v.startsWith('http') ? v : `https://${v}`));

export const updateProfileSchema = z
  .object({
    displayName: cleanText(limits.displayName.max),
    bio: cleanText(limits.bio.max),
    website,
    location: cleanText(limits.location.max),
    category: cleanText(40),
    accountType: z.enum(['personal', 'creator', 'professional']),
    isPrivate: z.boolean(),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, 'Nothing to update');
export type UpdateProfileInput = z.input<typeof updateProfileSchema>;

export const interestsSchema = z.object({
  interests: z
    .array(z.enum(interestCatalog))
    .min(limits.interests.min, 'Pick at least one interest')
    .max(limits.interests.max, `Pick up to ${limits.interests.max}`)
    .transform((a) => [...new Set(a)]),
});

export const updateSettingsSchema = z
  .object({
    theme: z.enum(['system', 'light', 'dark']),
    language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Use a language tag like en or pt-BR'),
    timezone: z.string().max(64).refine((tz) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, 'Unknown time zone'),
    country: z.string().regex(/^[A-Z]{2}$/, 'Use an ISO country code').or(z.literal('')),
    privacy: z
      .object({
        showActivityStatus: z.boolean(),
        allowMentionsFrom: z.enum(['everyone', 'following', 'nobody']),
        allowMessagesFrom: z.enum(['everyone', 'following', 'nobody']),
        allowCommentsFrom: z.enum(['everyone', 'following', 'followers', 'nobody']),
        hiddenWords: z.array(cleanText(40).pipe(z.string().min(1))).max(200),
      })
      .partial(),
    notifications: z
      .object({
        likes: z.boolean(),
        comments: z.boolean(),
        follows: z.boolean(),
        mentions: z.boolean(),
        messages: z.boolean(),
        email: z.boolean(),
        push: z.boolean(),
      })
      .partial(),
  })
  .partial();

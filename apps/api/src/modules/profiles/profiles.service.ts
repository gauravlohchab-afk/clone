import type { PublicProfileDto } from '@vyro/types';
import { notFound } from '../../lib/errors.js';
import { Profile } from './profile.model.js';
import { toProfileDto } from '../users/users.mapper.js';

/**
 * Profile lookup with visibility rules. Phase 2 extends `canViewContent`
 * with follow relationships and blocks (a blocked viewer gets 404).
 */
export async function getPublicProfile(username: string, viewerId?: string): Promise<PublicProfileDto> {
  const profile = await Profile.findOne({ username: username.toLowerCase(), visible: true }).lean();
  if (!profile) throw notFound('This account does not exist or is unavailable');
  const isSelf = !!viewerId && String(profile.userId) === viewerId;
  return {
    ...toProfileDto(profile),
    viewer: { isSelf, canViewContent: isSelf || !profile.isPrivate },
  };
}

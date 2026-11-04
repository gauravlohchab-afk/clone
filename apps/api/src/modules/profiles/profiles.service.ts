import type { PublicProfileDto } from '@vyro/types';
import { toProfileDto } from '../users/users.mapper.js';
import { canViewContent, getRelationship, resolveVisibleProfile } from '../relationships/relationships.service.js';

/**
 * Profile lookup with visibility rules: hidden accounts and accounts that
 * block the viewer are 404; private accounts hide content from non-followers.
 */
export async function getPublicProfile(username: string, viewerId?: string): Promise<PublicProfileDto> {
  const profile = await resolveVisibleProfile(username, viewerId);
  const relationship = viewerId ? await getRelationship(viewerId, profile.userId) : null;
  return {
    ...toProfileDto(profile),
    viewer: { isSelf: !!relationship?.isSelf, canViewContent: canViewContent(profile, relationship), relationship },
  };
}

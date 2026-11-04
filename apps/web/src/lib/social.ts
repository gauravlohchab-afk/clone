import type { FollowRequestDto, FollowResultDto, MutedAccountDto, Page, ProfileSummaryDto, RelationshipDto } from '@vyro/types';
import { api } from './api';

const u = (username: string) => `/api/v1/users/${encodeURIComponent(username)}`;
const qs = (cursor?: string | null, limit = 20) => `?limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;

export type ConnectionKind = 'followers' | 'following';

export const social = {
  follow: (username: string) => api.post<FollowResultDto>(`${u(username)}/follow`),
  unfollow: (username: string) => api.delete<FollowResultDto>(`${u(username)}/follow`),
  removeFollower: (username: string) => api.delete<unknown>(`${u(username)}/follower`),
  connections: (username: string, kind: ConnectionKind, cursor?: string | null) =>
    api.get<Page<ProfileSummaryDto>>(`${u(username)}/${kind}${qs(cursor)}`),
  mutuals: (username: string, limit = 3) => api.get<{ items: ProfileSummaryDto[]; total: number }>(`${u(username)}/mutuals?limit=${limit}`),

  block: (username: string) => api.post<RelationshipDto>(`${u(username)}/block`),
  unblock: (username: string) => api.delete<RelationshipDto>(`${u(username)}/block`),
  restrict: (username: string) => api.post<RelationshipDto>(`${u(username)}/restrict`),
  unrestrict: (username: string) => api.delete<RelationshipDto>(`${u(username)}/restrict`),
  mute: (username: string, m: { posts: boolean; stories: boolean }) => api.post<RelationshipDto>(`${u(username)}/mute`, m),
  unmute: (username: string) => api.delete<RelationshipDto>(`${u(username)}/mute`),

  requests: (cursor?: string | null) => api.get<Page<FollowRequestDto>>(`/api/v1/me/follow-requests${qs(cursor)}`),
  approve: (id: string) => api.post<unknown>(`/api/v1/me/follow-requests/${id}/approve`),
  decline: (id: string) => api.delete<void>(`/api/v1/me/follow-requests/${id}`),
  suggestions: (limit = 12) => api.get<{ items: ProfileSummaryDto[] }>(`/api/v1/me/suggestions?limit=${limit}`),
  safetyList: <K extends 'blocked' | 'restricted' | 'muted'>(kind: K, cursor?: string | null) =>
    api.get<Page<K extends 'muted' ? MutedAccountDto : ProfileSummaryDto>>(`/api/v1/me/${kind}${qs(cursor)}`),
};

/** Label for the follow button given the viewer's state with that account. */
export function followLabel(r: { following: boolean; requested: boolean; followedBy?: boolean }) {
  if (r.following) return 'Following';
  if (r.requested) return 'Requested';
  return r.followedBy ? 'Follow back' : 'Follow';
}

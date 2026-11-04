/** How the signed-in viewer relates to another account. */
export interface RelationshipDto {
  isSelf: boolean;
  following: boolean;
  /** Viewer has a pending follow request to this private account. */
  requested: boolean;
  followedBy: boolean;
  blocking: boolean;
  restricting: boolean;
  muting: { posts: boolean; stories: boolean } | null;
}

export interface ProfileSummaryDto {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  /** Present when a viewer is signed in. */
  relationship?: Pick<RelationshipDto, 'isSelf' | 'following' | 'requested'>;
}

export interface FollowResultDto {
  status: 'following' | 'requested' | 'not_following';
  relationship: RelationshipDto;
  counts: { followers: number; following: number };
}

export interface FollowRequestDto {
  id: string;
  from: ProfileSummaryDto;
  createdAt: string;
}

export interface MutedAccountDto extends ProfileSummaryDto {
  muting: { posts: boolean; stories: boolean };
}

# Database schema (MongoDB + Mongoose)

Conventions: every collection has `createdAt`/`updatedAt`; ids are ObjectIds; list endpoints use `(createdAt desc, _id desc)` cursors; counts are denormalised and updated in the same transaction as the relationship write; large media never lives in MongoDB (only S3 keys and metadata).

## Implemented (Phase 1)

### users
| Field | Type | Notes |
|---|---|---|
| email | string | lowercase, **unique** |
| emailVerifiedAt | Date \| null | |
| passwordHash | string \| null | argon2id, `select: false`; null for Google-only accounts |
| passwordChangedAt | Date \| null | |
| googleSub | string | **unique (partial)** |
| username | string | lowercase, **unique (partial)**, mirrors profile |
| role | user \| moderator \| admin \| superadmin | default user |
| status | active \| deactivated \| pending_deletion \| suspended \| banned | |
| dateOfBirth | `YYYY-MM-DD` | age gating; never public |
| termsAcceptedAt, onboardingCompletedAt | Date | |
| mfa | `{ enabled, secretEnc*, pendingSecretEnc*, recoveryCodeHashes*, lastUsedStep* }` | *`select: false`; secret AES-256-GCM encrypted |
| failedLoginCount, lockedUntil | | brute-force lockout |
| deactivatedAt, deletionScheduledFor, lastActiveAt | Date | |

Indexes: `email` unique · `username` unique partial · `googleSub` unique partial · `{status, deletionScheduledFor}` (purge job) · `createdAt` (admin growth stats).

### profiles
`userId` **unique**, `username` **unique**, `displayName`, `bio`, `website`, `location`, `avatar {mediaId,url}`, `cover`, `accountType` (personal/creator/professional), `category`, `isPrivate`, `isVerified`, `visible` (false while deactivated/pending deletion/banned), `interests[]`, `counts {posts, followers, following}`.
Indexes: `userId` unique · `username` unique · `{interests, counts.followers desc}` (suggestions) · text index on `username` (w3), `displayName` (w2) for search.

### settings
`userId` **unique**, `theme`, `language`, `timezone`, `country`, `privacy {showActivityStatus, allowMentionsFrom, allowMessagesFrom, allowCommentsFrom, hiddenWords[]}`, `notifications {likes, comments, follows, mentions, messages, email, push}`. Created lazily on first read.

### sessions
`userId`, `refreshHash` (**unique**, SHA-256), `retired[{hash, at}]` (last 10, reuse detection), `platform`, `deviceName`, `userAgent`, `ip`, `method`, `lastUsedAt`, `expiresAt`, `revokedAt`, `revokeReason`.
Indexes: `refreshHash` unique · `retired.hash` · `{userId, revokedAt, lastUsedAt desc}` · TTL `expiresAt + 7 days`.

### authtokens
`userId`, `purpose` (verify_email \| reset_password), `tokenHash` **unique**, `expiresAt` (TTL), `usedAt`. Single use; previous unused tokens of the same purpose are deleted when a new one is issued.

### loginevents
`userId`, `type`, `method`, `ip`, `userAgent`, `createdAt`. Index `{userId, createdAt desc}`; TTL 180 days.

## Designed for later phases

| Collection | Key fields | Indexes / constraints |
|---|---|---|
| follows | followerId, followeeId | unique `{followerId, followeeId}`; `{followeeId, createdAt}` |
| followrequests | requesterId, targetId, status | unique `{requesterId, targetId}` |
| blocks / restrictions / mutes | userId, targetId, (mute scope) | unique `{userId, targetId}`; reverse index on targetId |
| posts | authorId, type (image/video/carousel/reel), caption, mediaIds[], hashtags[], mentions[], location, altTexts, visibility, counts, editedAt, hiddenAt, removedAt | `{authorId, createdAt}`; `{hashtags, createdAt}`; `{createdAt}` for explore; text index caption |
| media | ownerId, kind, status (pending/processing/ready/failed/deleted), s3Key, variants[], width, height, duration, mime, bytes, blurhash | `{ownerId, createdAt}`; `{status, updatedAt}` (stuck job sweep) |
| comments | postId, authorId, parentId, body, mentions, counts, removedAt | `{postId, parentId, createdAt}` |
| likes | userId, targetType, targetId | unique `{targetType, targetId, userId}`; `{userId, createdAt}` |
| hashtags | tag (normalised), postCount, lastUsedAt, trendingScore | unique `tag`; `{trendingScore desc}` |
| savedposts | userId, postId, collectionIds[] | unique `{userId, postId}` |
| collections | userId, name, coverPostId | unique `{userId, name}` |
| stories | authorId, mediaId, overlays, stickers (poll/question/link/mention/location), audience (all/close_friends), expiresAt, archived | `{authorId, expiresAt}`; expiry handled by job (archive, not TTL delete) |
| storyviews | storyId, viewerId, reaction | unique `{storyId, viewerId}` |
| highlights | ownerId, title, coverMediaId, storyIds[] | `{ownerId, order}` |
| closefriends | userId, friendId | unique pair |
| conversations | type (dm/group), memberIds[], admins[], title, lastMessageAt, dmKey | unique partial `dmKey` (sorted pair); `{memberIds, lastMessageAt}` |
| conversationmembers | conversationId, userId, role, mutedUntil, lastReadMessageId, status (active/request/left) | unique `{conversationId, userId}`; `{userId, status, updatedAt}` |
| messages | conversationId, senderId, kind, body, mediaId, replyToId, forwardedFromId, reactions[], editedAt, deletedFor[], unsentAt | `{conversationId, createdAt}` |
| notifications | userId, type, actorIds[], targetRef, groupKey, readAt | `{userId, readAt, createdAt}`; `{userId, groupKey}`; TTL 90 days |
| pushtokens | userId, platform, token, lastSeenAt | unique token |
| searchhistory | userId, kind, query/targetId | `{userId, createdAt}`; capped per user |
| reports | reporterId, targetType, targetId, reason, details, status, assigneeId | `{status, createdAt}`; `{targetType, targetId}` |
| moderationactions | moderatorId, targetType, targetId, action, reason, reportIds[], appealStatus | `{targetType, targetId}`; never deleted |
| appeals | userId, actionId, statement, status, decidedBy | `{status, createdAt}` |
| adminauditlogs | adminId, action, target, before, after, ip | `{adminId, createdAt}`; append-only |

## Transactions
Used where two collections must agree: username claim (users + profiles, implemented), follow/unfollow + counts, post create + hashtag counts, moderation action + content state + report status, account purge. Requires a replica set (Atlas always is; local dev uses `--replSet rs0`).

## Retention
Sessions: 7 days after expiry · login events: 180 days · auth tokens: at expiry · notifications: 90 days · stories: archived to the owner after 24 h, purged with the account · deleted accounts: purged 30 days after request (`purgeDueAccounts`; job scheduling arrives with BullMQ workers) · moderation records and admin audit logs: retained (legal review needed for durations).

## Backup and recovery
Atlas continuous cloud backup with point-in-time restore (target RPO ≤ 1 h, RTO ≤ 4 h), daily snapshots kept 7 days, weekly 4 weeks, monthly 12 months; quarterly restore drill into a staging project. S3 versioning + cross-region replication for media (Phase 3).

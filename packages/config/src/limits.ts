/** Product limits shared by clients (for UX hints) and the API (for enforcement). */
export const limits = {
  username: { min: 3, max: 30 },
  displayName: { max: 50 },
  bio: { max: 160 },
  website: { max: 200 },
  location: { max: 60 },
  password: { min: 10, max: 128 },
  interests: { min: 1, max: 10 },
  pagination: { defaultLimit: 20, maxLimit: 50 },
  sessionsPerUser: 20,
} as const;

/** Interest catalogue used during onboarding and for feed initialisation. */
export const interestCatalog = [
  'art', 'photography', 'music', 'dance', 'fashion', 'beauty', 'fitness', 'sports',
  'gaming', 'tech', 'science', 'food', 'travel', 'nature', 'pets', 'comedy',
  'film', 'books', 'design', 'architecture', 'cars', 'diy', 'education', 'finance',
  'wellness', 'parenting', 'activism', 'anime',
] as const;
export type Interest = (typeof interestCatalog)[number];

/** Usernames that can never be registered (routes, brand, staff impersonation). */
export const reservedUsernames = new Set([
  'admin', 'administrator', 'root', 'support', 'help', 'security', 'staff', 'moderator',
  'mod', 'official', 'api', 'www', 'app', 'login', 'logout', 'signup', 'register',
  'settings', 'explore', 'search', 'reels', 'stories', 'messages', 'inbox',
  'notifications', 'saved', 'onboarding', 'about', 'terms', 'privacy', 'legal',
  'vyro', 'team', 'null', 'undefined', 'me', 'account', 'accounts', 'p', 'u',
]);

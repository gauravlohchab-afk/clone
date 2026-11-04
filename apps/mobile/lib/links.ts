/**
 * Public web origin for legal pages and shareable links. Until a domain is
 * secured this comes from EXPO_PUBLIC_WEB_URL (e.g. the local web dev server).
 */
const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:5173').replace(/\/$/, '');
export const webUrl = (path: string) => `${WEB_URL}${path}`;

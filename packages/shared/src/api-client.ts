import type { ApiErrorBody, AuthSuccess, ErrorCode } from '@vyro/types';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface TokenStore {
  getAccessToken(): string | null;
  setAccessToken(token: string | null): void;
  /** Native clients persist the refresh token in secure storage; web leaves it to the httpOnly cookie. */
  getRefreshToken?(): Promise<string | null>;
  setRefreshToken?(token: string | null): Promise<void>;
}

export interface ApiClientOptions {
  baseUrl: string;
  tokens: TokenStore;
  platform: 'web' | 'ios' | 'android';
  /** Called when refresh fails and the user must sign in again. */
  onSessionExpired?: () => void;
  fetchImpl?: typeof fetch;
}

const CSRF_COOKIE = 'vyro_csrf';

function readCookie(name: string): string | null {
  const doc = (globalThis as { document?: { cookie: string } }).document;
  if (!doc) return null;
  const match = doc.cookie.split('; ').find((c: string) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

type Body = Record<string, unknown> | unknown[] | undefined;

export function createApiClient(opts: ApiClientOptions) {
  const doFetch = opts.fetchImpl ?? fetch.bind(globalThis);
  let refreshing: Promise<boolean> | null = null;

  async function raw(method: string, path: string, body?: Body, auth = true): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json', 'X-Client-Platform': opts.platform };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = opts.tokens.getAccessToken();
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    if (opts.platform === 'web') {
      const csrf = readCookie(CSRF_COOKIE);
      if (csrf) headers['X-CSRF-Token'] = csrf;
    }
    return doFetch(`${opts.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: opts.platform === 'web' ? 'include' : 'omit',
    });
  }

  async function parse<T>(res: Response): Promise<T> {
    if (res.status === 204) return undefined as T;
    const data = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      const err = (data as ApiErrorBody | null)?.error;
      throw new ApiError(res.status, err?.code ?? 'INTERNAL', err?.message ?? `Request failed (${res.status})`, err?.details);
    }
    return data as T;
  }

  async function refresh(): Promise<boolean> {
    refreshing ??= (async () => {
      try {
        const refreshToken = (await opts.tokens.getRefreshToken?.()) ?? undefined;
        const res = await raw('POST', '/api/v1/auth/refresh', refreshToken ? { refreshToken } : {}, false);
        if (!res.ok) return false;
        const data = (await res.json()) as AuthSuccess;
        opts.tokens.setAccessToken(data.accessToken);
        if (data.refreshToken) await opts.tokens.setRefreshToken?.(data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        queueMicrotask(() => (refreshing = null));
      }
    })();
    return refreshing;
  }

  async function request<T>(method: string, path: string, body?: Body): Promise<T> {
    let res = await raw(method, path, body);
    if (res.status === 401 && !path.startsWith('/api/v1/auth/login')) {
      const code = ((await res.clone().json().catch(() => null)) as ApiErrorBody | null)?.error?.code;
      if (code === 'TOKEN_EXPIRED' || code === 'UNAUTHENTICATED') {
        if (await refresh()) res = await raw(method, path, body);
        else {
          opts.tokens.setAccessToken(null);
          opts.onSessionExpired?.();
        }
      }
    }
    return parse<T>(res);
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: Body) => request<T>('POST', path, body ?? {}),
    patch: <T>(path: string, body: Body) => request<T>('PATCH', path, body),
    put: <T>(path: string, body: Body) => request<T>('PUT', path, body),
    delete: <T>(path: string, body?: Body) => request<T>('DELETE', path, body),
    refresh,
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

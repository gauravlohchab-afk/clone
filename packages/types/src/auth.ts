import type { MeDto } from './user.js';

export type ClientPlatform = 'web' | 'ios' | 'android';

/**
 * Successful authentication. Web clients receive the refresh token as an
 * httpOnly cookie and `refreshToken` is omitted; native clients store it in
 * the platform keychain.
 */
export interface AuthSuccess {
  status: 'authenticated';
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken?: string;
  user: MeDto;
}

export interface MfaChallenge {
  status: 'mfa_required';
  mfaToken: string;
}

export type LoginResult = AuthSuccess | MfaChallenge;

export interface MfaSetupDto {
  secret: string;
  otpauthUrl: string;
}

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-router', () => ({ Link: ({ children }: { children: React.ReactNode }) => children, router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

const mockPost = jest.fn();
jest.mock('../lib/api', () => ({
  platform: 'ios',
  api: { post: (...a: unknown[]) => mockPost(...a), get: jest.fn() },
  setAccessToken: jest.fn(),
  onSessionExpired: jest.fn(),
}));

import Login from '../app/(auth)/login';
import { useAuth } from '../stores/auth';
import { ApiError } from '@vyro/shared';

const me = { id: 'u1', email: 'a@b.co', emailVerified: true, username: 'nova', role: 'user', status: 'active', mfaEnabled: true, hasPassword: true, googleLinked: false, onboardingCompleted: true, createdAt: '', profile: null };

beforeEach(() => { mockPost.mockReset(); useAuth.setState({ status: 'signed_out', user: null }); });

it('validates before calling the API', async () => {
  render(<Login />);
  fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
  expect(await screen.findAllByText('Required')).toHaveLength(2);
  expect(mockPost).not.toHaveBeenCalled();
});

it('shows server errors', async () => {
  mockPost.mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email, username or password'));
  render(<Login />);
  fireEvent.changeText(screen.getByLabelText('Email or username'), 'nova');
  fireEvent.changeText(screen.getByLabelText('Password'), 'whatever 1');
  fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
  expect(await screen.findByText('Incorrect email, username or password')).toBeTruthy();
});

it('handles the two-factor step and signs in', async () => {
  mockPost
    .mockResolvedValueOnce({ status: 'mfa_required', mfaToken: 'm1' })
    .mockResolvedValueOnce({ status: 'authenticated', accessToken: 't', accessTokenExpiresAt: '', refreshToken: 'r', user: me });
  render(<Login />);
  fireEvent.changeText(screen.getByLabelText('Email or username'), 'nova');
  fireEvent.changeText(screen.getByLabelText('Password'), 'electric lime 42');
  fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
  const codeInput = await screen.findByLabelText('Code');
  expect(codeInput.props.value).toBe('');
  fireEvent.changeText(codeInput, '123456');
  fireEvent.press(screen.getByRole('button', { name: 'Verify' }));
  await waitFor(() => expect(useAuth.getState().status).toBe('signed_in'));
  expect(mockPost).toHaveBeenLastCalledWith('/api/v1/auth/login/mfa', { mfaToken: 'm1', code: '123456', platform: 'ios' });
});

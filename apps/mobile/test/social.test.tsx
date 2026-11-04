import { Alert as NativeAlert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

const mockPost = jest.fn();
const mockDelete = jest.fn();
const mockGet = jest.fn();
jest.mock('../lib/api', () => ({
  platform: 'ios',
  api: { post: (...a: unknown[]) => mockPost(...a), delete: (...a: unknown[]) => mockDelete(...a), get: (...a: unknown[]) => mockGet(...a) },
  setAccessToken: jest.fn(),
  onSessionExpired: jest.fn(),
}));

import { FollowButton } from '../components/social/FollowButton';
import { ProfileActions } from '../components/social/ProfileActions';
import FollowRequestsScreen from '../app/requests';

const rel = { isSelf: false, following: false, requested: false, followedBy: false, blocking: false, restricting: false, muting: null };
const summary = (username: string) => ({ userId: `id-${username}`, username, displayName: '', avatarUrl: null, isVerified: false, isPrivate: false });

beforeEach(() => { mockPost.mockReset(); mockDelete.mockReset(); mockGet.mockReset(); });

test('follow a public account', async () => {
  mockPost.mockResolvedValue({ status: 'following', relationship: { ...rel, following: true }, counts: { followers: 1, following: 0 } });
  render(<FollowButton username="nova" isPrivate={false} state={rel} />);
  fireEvent.press(screen.getByLabelText('Follow @nova'));
  expect(mockPost).toHaveBeenCalledWith('/api/v1/users/nova/follow');
  expect(await screen.findByText('Following')).toBeTruthy();
});

test('unfollowing a private account asks first', async () => {
  const alert = jest.spyOn(NativeAlert, 'alert').mockImplementation(() => undefined);
  render(<FollowButton username="quiet" isPrivate state={{ ...rel, following: true }} />);
  fireEvent.press(screen.getByLabelText('Following @quiet'));
  expect(alert).toHaveBeenCalledWith('Unfollow @quiet?', expect.any(String), expect.any(Array));
  expect(mockDelete).not.toHaveBeenCalled();
  alert.mockRestore();
});

test('mute posts only from the profile menu', async () => {
  mockPost.mockResolvedValue({ ...rel, muting: { posts: true, stories: false } });
  const onChange = jest.fn();
  render(<ProfileActions username="nova" relationship={rel} onChange={onChange} />);
  fireEvent.press(screen.getByLabelText('More options for @nova'));
  fireEvent.press(screen.getByLabelText('Mute'));
  fireEvent(screen.getByLabelText('Mute stories'), 'valueChange', false);
  fireEvent.press(screen.getByText('Mute'));
  await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/api/v1/users/nova/mute', { posts: true, stories: false }));
  await waitFor(() => expect(onChange).toHaveBeenCalled());
});

test('approve a follow request', async () => {
  mockGet.mockResolvedValue({ items: [{ id: 'r1', from: summary('ari'), createdAt: '' }], nextCursor: null });
  mockPost.mockResolvedValue({});
  render(<FollowRequestsScreen />);
  fireEvent.press(await screen.findByLabelText('Confirm @ari'));
  await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/api/v1/me/follow-requests/r1/approve'));
  await waitFor(() => expect(screen.queryByText('ari')).toBeNull());
  expect(screen.getByText('No pending requests.')).toBeTruthy();
});

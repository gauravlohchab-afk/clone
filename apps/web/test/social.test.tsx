import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';

const post = vi.fn();
const del = vi.fn();
const get = vi.fn();
vi.mock('../src/lib/api', () => ({
  api: { post: (...a: unknown[]) => post(...a), get: (...a: unknown[]) => get(...a), delete: (...a: unknown[]) => del(...a), patch: vi.fn(), put: vi.fn(), refresh: vi.fn() },
  setAccessToken: vi.fn(),
  onSessionExpired: vi.fn(),
}));

import { FollowButton } from '../src/components/social/FollowButton';
import { ProfileActions } from '../src/components/social/ProfileActions';
import { FollowRequests } from '../src/pages/social/FollowRequests';
import { followLabel } from '../src/lib/social';

const rel = { isSelf: false, following: false, requested: false, followedBy: false, blocking: false, restricting: false, muting: null };
const summary = (username: string) => ({ userId: `id-${username}`, username, displayName: username.toUpperCase(), avatarUrl: null, isVerified: false, isPrivate: false });
const renderIn = (el: React.ReactNode) => render(<RouterProvider router={createMemoryRouter([{ path: '/', element: el }, { path: '/:u', element: <p>profile</p> }])} />);

beforeEach(() => { post.mockReset(); del.mockReset(); get.mockReset(); });

describe('followLabel', () => {
  it('names each state', () => {
    expect(followLabel({ following: false, requested: false })).toBe('Follow');
    expect(followLabel({ following: false, requested: false, followedBy: true })).toBe('Follow back');
    expect(followLabel({ following: false, requested: true })).toBe('Requested');
    expect(followLabel({ following: true, requested: false })).toBe('Following');
  });
});

describe('FollowButton', () => {
  it('follows a public account and shows Following', async () => {
    post.mockResolvedValue({ status: 'following', relationship: { ...rel, following: true }, counts: { followers: 1, following: 0 } });
    renderIn(<FollowButton username="nova" isPrivate={false} state={rel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Follow @nova' }));
    expect(post).toHaveBeenCalledWith('/api/v1/users/nova/follow');
    expect(await screen.findByText('Following')).toBeInTheDocument();
  });

  it('shows Requested for a private account', async () => {
    post.mockResolvedValue({ status: 'requested', relationship: { ...rel, requested: true }, counts: { followers: 0, following: 0 } });
    renderIn(<FollowButton username="quiet" isPrivate state={rel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Follow @quiet' }));
    expect(await screen.findByText('Requested')).toBeInTheDocument();
  });

  it('asks before unfollowing a private account', async () => {
    del.mockResolvedValue({ status: 'not_following', relationship: rel, counts: { followers: 0, following: 0 } });
    renderIn(<FollowButton username="quiet" isPrivate state={{ ...rel, following: true }} />);
    await userEvent.click(screen.getByRole('button', { name: /Following @quiet/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Unfollow @quiet?' });
    expect(del).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Unfollow' }));
    expect(del).toHaveBeenCalledWith('/api/v1/users/quiet/follow');
    expect(await screen.findByText('Follow')).toBeInTheDocument();
  });

  it('shows the server error', async () => {
    post.mockRejectedValue(new Error('Verify your email first'));
    renderIn(<FollowButton username="nova" isPrivate={false} state={rel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Follow @nova' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

describe('ProfileActions', () => {
  it('blocks after confirmation and reports the new relationship', async () => {
    const blocked = { ...rel, blocking: true };
    post.mockResolvedValue(blocked);
    const onChange = vi.fn();
    renderIn(<ProfileActions username="nova" relationship={rel} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'More options for @nova' }));
    await userEvent.click(screen.getByRole('button', { name: 'Block' }));
    const dialog = screen.getByRole('dialog', { name: 'Block @nova?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Block' }));
    expect(post).toHaveBeenCalledWith('/api/v1/users/nova/block');
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(blocked));
  });

  it('mutes stories only', async () => {
    post.mockResolvedValue({ ...rel, muting: { posts: false, stories: true } });
    renderIn(<ProfileActions username="nova" relationship={rel} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'More options for @nova' }));
    await userEvent.click(screen.getByRole('button', { name: /^Mute/ }));
    await userEvent.click(screen.getByRole('switch', { name: 'Mute posts' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mute' }));
    expect(post).toHaveBeenCalledWith('/api/v1/users/nova/mute', { posts: false, stories: true });
  });

  it('offers Remove follower only when they follow you', async () => {
    renderIn(<ProfileActions username="nova" relationship={rel} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'More options for @nova' }));
    expect(screen.queryByRole('button', { name: /remove follower/i })).not.toBeInTheDocument();
  });
});

describe('FollowRequests', () => {
  it('lists requests and removes one once confirmed', async () => {
    get.mockResolvedValue({ items: [{ id: 'r1', from: summary('ari'), createdAt: '' }, { id: 'r2', from: summary('bo'), createdAt: '' }], nextCursor: null });
    post.mockResolvedValue({});
    renderIn(<FollowRequests />);
    expect(await screen.findByText('ari')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm @ari' }));
    expect(post).toHaveBeenCalledWith('/api/v1/me/follow-requests/r1/approve');
    await waitFor(() => expect(screen.queryByText('ari')).not.toBeInTheDocument());
    expect(screen.getByText('bo')).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    get.mockResolvedValue({ items: [], nextCursor: null });
    renderIn(<FollowRequests />);
    expect(await screen.findByText('No pending requests.')).toBeInTheDocument();
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ApiError } from '@vyro/shared';

const post = vi.fn();
vi.mock('../src/lib/api', () => ({
  api: { post: (...a: unknown[]) => post(...a), get: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn(), refresh: vi.fn() },
  setAccessToken: vi.fn(),
  onSessionExpired: vi.fn(),
}));

import { Signup } from '../src/pages/Signup';
import { Login } from '../src/pages/Login';
import { useAuth } from '../src/stores/auth';

const me = { id: 'u1', email: 'a@b.co', emailVerified: false, username: null, role: 'user', status: 'active', mfaEnabled: false, hasPassword: true, googleLinked: false, onboardingCompleted: false, createdAt: new Date().toISOString(), profile: null };

function renderAt(element: React.ReactNode, path = '/') {
  const router = createMemoryRouter([{ path, element }, { path: '/onboarding', element: <p>onboarding page</p> }, { path: '/:u', element: <p>profile page</p> }], { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  post.mockReset();
  useAuth.setState({ status: 'signed_out', user: null });
});

describe('Signup', () => {
  it('shows field validation without calling the API', async () => {
    renderAt(<Signup />, '/signup');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(screen.getByText(/accept the terms/i)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('registers and continues to onboarding', async () => {
    post.mockResolvedValue({ status: 'authenticated', accessToken: 't', accessTokenExpiresAt: '', user: me });
    renderAt(<Signup />, '/signup');
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('Password'), 'electric lime 42');
    await userEvent.type(screen.getByLabelText('Date of birth'), '2000-01-01');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText('onboarding page')).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/api/v1/auth/register', expect.objectContaining({ email: 'a@b.co', platform: 'web', acceptTerms: true }));
    expect(useAuth.getState().status).toBe('signed_in');
  });

  it('maps server field errors onto the form', async () => {
    post.mockRejectedValue(new ApiError(400, 'VALIDATION_FAILED', 'Some fields', [{ path: 'dateOfBirth', message: 'You must be at least 13' }]));
    renderAt(<Signup />, '/signup');
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('Password'), 'electric lime 42');
    await userEvent.type(screen.getByLabelText('Date of birth'), '2020-01-01');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText('You must be at least 13')).toBeInTheDocument();
  });
});

describe('Login', () => {
  it('shows server errors', async () => {
    post.mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email, username or password'));
    renderAt(<Login />, '/login');
    await userEvent.type(screen.getByLabelText('Email or username'), 'nova');
    await userEvent.type(screen.getByLabelText('Password'), 'whatever');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByText(/incorrect email/i)).toBeInTheDocument();
  });

  it('asks for a 2FA code, then signs in', async () => {
    post
      .mockResolvedValueOnce({ status: 'mfa_required', mfaToken: 'mfa-1' })
      .mockResolvedValueOnce({ status: 'authenticated', accessToken: 't', accessTokenExpiresAt: '', user: { ...me, emailVerified: true, username: 'nova', onboardingCompleted: true } });
    renderAt(<Login />, '/login');
    await userEvent.type(screen.getByLabelText('Email or username'), 'nova');
    await userEvent.type(screen.getByLabelText('Password'), 'electric lime 42');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    await userEvent.type(await screen.findByLabelText('Code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));
    await waitFor(() => expect(screen.getByText('profile page')).toBeInTheDocument());
    expect(post).toHaveBeenLastCalledWith('/api/v1/auth/login/mfa', { mfaToken: 'mfa-1', code: '123456', platform: 'web' });
  });
});

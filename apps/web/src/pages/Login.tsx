import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginSchema, type LoginInput } from '@vyro/validation';
import type { LoginResult } from '@vyro/types';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordField, TextField } from '../components/Field';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { api } from '../lib/api';
import { applyApiError, errorMessage } from '../lib/form-errors';
import { homePathFor, useAuth } from '../stores/auth';

const codeSchema = z.object({ code: z.string().trim().min(6, 'Enter the 6-digit code or a recovery code').max(20) });

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const acceptAuth = useAuth((s) => s.acceptAuth);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function finish(result: LoginResult) {
    if (result.status === 'mfa_required') return setMfaToken(result.mfaToken);
    acceptAuth(result);
    const from = (location.state as { from?: string } | null)?.from;
    navigate(result.user.onboardingCompleted && from ? from : homePathFor(result.user), { replace: true });
  }

  const creds = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const mfa = useForm<{ code: string }>({ resolver: zodResolver(codeSchema) });

  const submitCreds = creds.handleSubmit(async (v) => {
    setFormError(null);
    try {
      finish(await api.post<LoginResult>('/api/v1/auth/login', { ...v, platform: 'web' }));
    } catch (err) {
      setFormError(applyApiError(err, creds.setError, ['identifier', 'password']));
    }
  });

  const submitCode = mfa.handleSubmit(async ({ code }) => {
    setFormError(null);
    try {
      finish(await api.post<LoginResult>('/api/v1/auth/login/mfa', { mfaToken, code, platform: 'web' }));
    } catch (err) {
      setFormError(errorMessage(err));
    }
  });

  if (mfaToken) {
    return (
      <AuthLayout title="Two-factor check" subtitle="Enter the code from your authenticator app, or one of your recovery codes.">
        <form key="mfa" onSubmit={submitCode} noValidate className="space-y-4">
          {formError && <Alert tone="error">{formError}</Alert>}
          <TextField label="Code" autoComplete="one-time-code" inputMode="text" autoFocus error={mfa.formState.errors.code?.message} {...mfa.register('code')} />
          <Button type="submit" block loading={mfa.formState.isSubmitting}>Verify</Button>
          <Button variant="ghost" block onClick={() => { setMfaToken(null); setFormError(null); }}>Back</Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Welcome back"
      footer={<>New here? <Link to="/signup" className="font-semibold text-link">Create an account</Link></>}
    >
      <form key="creds" onSubmit={submitCreds} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField label="Email or username" autoComplete="username" autoCapitalize="none" error={creds.formState.errors.identifier?.message} {...creds.register('identifier')} />
        <PasswordField label="Password" autoComplete="current-password" error={creds.formState.errors.password?.message} {...creds.register('password')} />
        <div className="text-right text-sm"><Link to="/forgot-password" className="font-semibold text-link">Forgot password?</Link></div>
        <Button type="submit" block loading={creds.formState.isSubmitting}>Log in</Button>
      </form>
    </AuthLayout>
  );
}

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { password } from '@vyro/validation';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordField } from '../components/Field';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { api } from '../lib/api';
import { errorMessage } from '../lib/form-errors';
import { useAuth } from '../stores/auth';

const schema = z.object({ password, confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const clear = useAuth((s) => s.clear);
  const [error, setErr] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <AuthLayout title="Link not valid">
        <Alert tone="error">This reset link is incomplete. <Link to="/forgot-password" className="font-semibold underline">Request a new one</Link>.</Alert>
      </AuthLayout>
    );
  }

  const onSubmit = handleSubmit(async (v) => {
    setErr(null);
    try {
      await api.post('/api/v1/auth/reset-password', { token, password: v.password });
      clear();
      navigate('/login', { replace: true, state: { reset: true } });
    } catch (e) {
      setErr(errorMessage(e));
    }
  });

  return (
    <AuthLayout title="Choose a new password" subtitle="You will be signed out on every device.">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <PasswordField label="New password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
        <PasswordField label="Confirm new password" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')} />
        <Button type="submit" block loading={isSubmitting}>Update password</Button>
      </form>
    </AuthLayout>
  );
}

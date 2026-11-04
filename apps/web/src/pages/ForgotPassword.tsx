import { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '@vyro/validation';
import { AuthLayout } from '../components/AuthLayout';
import { TextField } from '../components/Field';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { api } from '../lib/api';
import { errorMessage } from '../lib/form-errors';

export function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [error, setErr] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>({ resolver: zodResolver(forgotPasswordSchema) });
  const onSubmit = handleSubmit(async (v) => {
    setErr(null);
    try {
      await api.post('/api/v1/auth/forgot-password', v);
      setSent(true);
    } catch (e) {
      setErr(errorMessage(e));
    }
  });
  return (
    <AuthLayout title="Reset your password" subtitle="We will email you a link to choose a new one." footer={<Link to="/login" className="font-semibold text-link">Back to log in</Link>}>
      {sent ? (
        <Alert tone="success">If an account exists for that email, a reset link is on its way. It expires in one hour.</Alert>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
          <Button type="submit" block loading={isSubmitting}>Send reset link</Button>
        </form>
      )}
    </AuthLayout>
  );
}

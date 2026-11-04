import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@vyro/validation';
import type { AuthSuccess } from '@vyro/types';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordField, TextField } from '../components/Field';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { api } from '../lib/api';
import { applyApiError } from '../lib/form-errors';
import { useAuth } from '../stores/auth';
import { brand } from '../lib/brand';

export function Signup() {
  const navigate = useNavigate();
  const acceptAuth = useAuth((s) => s.acceptAuth);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { platform: 'web' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const res = await api.post<AuthSuccess>('/api/v1/auth/register', { ...values, platform: 'web' });
      acceptAuth(res);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setFormError(applyApiError(err, setError, ['email', 'password', 'dateOfBirth', 'acceptTerms']));
    }
  });

  return (
    <AuthLayout
      title={`Join ${brand.name}`}
      subtitle="Create your account in a minute."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-link">Log in</Link></>}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField label="Email" type="email" autoComplete="email" inputMode="email" error={errors.email?.message} {...register('email')} />
        <PasswordField label="Password" autoComplete="new-password" hint="At least 10 characters with a letter and a number." error={errors.password?.message} {...register('password')} />
        <TextField label="Date of birth" type="date" autoComplete="bday" hint="Not shown on your profile. Used to keep younger people safe." error={errors.dateOfBirth?.message} {...register('dateOfBirth')} />
        <div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-5 accent-[var(--color-primary)]" aria-invalid={!!errors.acceptTerms} {...register('acceptTerms')} />
            <span>
              I agree to the <Link to="/legal/terms" target="_blank" className="font-semibold text-link">Terms</Link> and{' '}
              <Link to="/legal/privacy" target="_blank" className="font-semibold text-link">Privacy Policy</Link>.
            </span>
          </label>
          {errors.acceptTerms && <p role="alert" className="mt-1.5 text-xs font-medium text-danger">{errors.acceptTerms.message}</p>}
        </div>
        <Button type="submit" block loading={isSubmitting}>Create account</Button>
      </form>
    </AuthLayout>
  );
}

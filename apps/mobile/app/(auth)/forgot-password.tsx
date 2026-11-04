import { useState } from 'react';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '@vyro/validation';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { Alert } from '../../components/Alert';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });
  return (
    <Screen title="Reset your password" subtitle="We will email you a link to choose a new one.">
      {sent ? (
        <Alert tone="success">If an account exists for that email, a reset link is on its way. It expires in one hour.</Alert>
      ) : (
        <>
          {error && <Alert tone="error">{error}</Alert>}
          <Controller control={control} name="email" render={({ field }) => (
            <TextField label="Email" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={field.value} onChangeText={field.onChange} error={errors.email?.message} />
          )} />
          <Button title="Send reset link" loading={isSubmitting} onPress={handleSubmit(async (v) => {
            setError(null);
            try { await api.post('/api/v1/auth/forgot-password', v); setSent(true); } catch (e) { setError(errorMessage(e)); }
          })} />
        </>
      )}
      <Button title="Back to log in" variant="ghost" onPress={() => router.replace('/login')} />
    </Screen>
  );
}

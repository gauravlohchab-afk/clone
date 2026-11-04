import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { password } from '@vyro/validation';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { api } from '../lib/api';
import { errorMessage } from '../lib/errors';
import { useAuth } from '../stores/auth';

const schema = z.object({ password, confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

/** Deep link target: <scheme>://reset-password?token=… */
export default function ResetPassword() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { password: '', confirm: '' } });
  if (!token) return <Screen title="Link not valid"><Alert tone="error">This reset link is incomplete. Request a new one from the log in screen.</Alert></Screen>;
  return (
    <Screen title="Choose a new password" subtitle="You will be signed out on every device.">
      {error && <Alert tone="error">{error}</Alert>}
      <Controller control={control} name="password" render={({ field }) => (
        <TextField label="New password" password textContentType="newPassword" value={field.value} onChangeText={field.onChange} error={errors.password?.message} />
      )} />
      <Controller control={control} name="confirm" render={({ field }) => (
        <TextField label="Confirm new password" password textContentType="newPassword" value={field.value} onChangeText={field.onChange} error={errors.confirm?.message} />
      )} />
      <Button title="Update password" loading={isSubmitting} onPress={handleSubmit(async (v) => {
        setError(null);
        try {
          await api.post('/api/v1/auth/reset-password', { token, password: v.password });
          await useAuth.getState().clear();
          router.replace('/login');
        } catch (e) { setError(errorMessage(e)); }
      })} />
    </Screen>
  );
}

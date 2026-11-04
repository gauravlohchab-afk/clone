import { useState } from 'react';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginSchema, type LoginInput } from '@vyro/validation';
import type { LoginResult } from '@vyro/types';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { Alert } from '../../components/Alert';
import { Text } from '../../components/Text';
import { api, platform } from '../../lib/api';
import { applyApiError, errorMessage } from '../../lib/errors';
import { useAuth } from '../../stores/auth';
import { useTheme } from '../../stores/theme';

const codeSchema = z.object({ code: z.string().trim().min(6, 'Enter the 6-digit code or a recovery code').max(20) });

export default function Login() {
  const { c } = useTheme();
  const acceptAuth = useAuth((s) => s.acceptAuth);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const creds = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: '', password: '' } });
  const mfa = useForm<{ code: string }>({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } });

  async function finish(result: LoginResult) {
    if (result.status === 'mfa_required') return setMfaToken(result.mfaToken);
    await acceptAuth(result); // the (auth) layout redirects once a user exists
  }

  if (mfaToken) {
    return (
      <Screen key="mfa" title="Two-factor check" subtitle="Enter the code from your authenticator app, or one of your recovery codes.">
        {formError && <Alert tone="error">{formError}</Alert>}
        <Controller control={mfa.control} name="code" render={({ field }) => (
          <TextField label="Code" autoFocus autoCapitalize="none" autoComplete="one-time-code" textContentType="oneTimeCode"
            value={field.value} onChangeText={field.onChange} error={mfa.formState.errors.code?.message} />
        )} />
        <Button title="Verify" loading={mfa.formState.isSubmitting} onPress={mfa.handleSubmit(async ({ code }) => {
          setFormError(null);
          try { await finish(await api.post<LoginResult>('/api/v1/auth/login/mfa', { mfaToken, code, platform })); }
          catch (e) { setFormError(errorMessage(e)); }
        })} />
        <Button title="Back" variant="ghost" onPress={() => { setMfaToken(null); setFormError(null); }} />
      </Screen>
    );
  }

  return (
    <Screen key="creds" title="Welcome back">
      {formError && <Alert tone="error">{formError}</Alert>}
      <Controller control={creds.control} name="identifier" render={({ field }) => (
        <TextField label="Email or username" autoCapitalize="none" autoCorrect={false} autoComplete="username" textContentType="username"
          value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={creds.formState.errors.identifier?.message} />
      )} />
      <Controller control={creds.control} name="password" render={({ field }) => (
        <TextField label="Password" password autoComplete="current-password" textContentType="password"
          value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={creds.formState.errors.password?.message} />
      )} />
      <Link href="/forgot-password" style={{ color: c.link, alignSelf: 'flex-end' }}>Forgot password?</Link>
      <Button title="Log in" loading={creds.formState.isSubmitting} onPress={creds.handleSubmit(async (v) => {
        setFormError(null);
        try { await finish(await api.post<LoginResult>('/api/v1/auth/login', { ...v, platform })); }
        catch (e) { setFormError(applyApiError(e, creds.setError, ['identifier', 'password'])); }
      })} />
      <Text variant="muted" style={{ textAlign: 'center' }}>
        New here? <Link href="/signup" style={{ color: c.link }}>Create an account</Link>
      </Text>
    </Screen>
  );
}

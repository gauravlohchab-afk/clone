import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@vyro/validation';
import type { AuthSuccess } from '@vyro/types';
import { Check } from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { Alert } from '../../components/Alert';
import { Text } from '../../components/Text';
import { api, platform } from '../../lib/api';
import { applyApiError } from '../../lib/errors';
import { brand } from '../../lib/brand';
import { useAuth } from '../../stores/auth';
import { useTheme } from '../../stores/theme';
import { webUrl } from '../../lib/links';
import { formatDob } from '../../lib/format';

export default function Signup() {
  const { c } = useTheme();
  const acceptAuth = useAuth((s) => s.acceptAuth);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', dateOfBirth: '', acceptTerms: false as unknown as true, platform },
  });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await acceptAuth(await api.post<AuthSuccess>('/api/v1/auth/register', { ...v, platform }));
    } catch (e) {
      setFormError(applyApiError(e, setError, ['email', 'password', 'dateOfBirth', 'acceptTerms']));
    }
  });

  return (
    <Screen title={`Join ${brand.name}`} subtitle="Create your account in a minute.">
      {formError && <Alert tone="error">{formError}</Alert>}
      <Controller control={control} name="email" render={({ field }) => (
        <TextField label="Email" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress"
          value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.email?.message} />
      )} />
      <Controller control={control} name="password" render={({ field }) => (
        <TextField label="Password" password autoComplete="new-password" textContentType="newPassword" hint="At least 10 characters with a letter and a number."
          value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.password?.message} />
      )} />
      <Controller control={control} name="dateOfBirth" render={({ field }) => (
        <TextField label="Date of birth" placeholder="YYYY-MM-DD" keyboardType="number-pad" autoComplete="birthdate-full" maxLength={10}
          hint="Not shown on your profile. Used to keep younger people safe."
          value={field.value} onChangeText={(t) => field.onChange(formatDob(t))} onBlur={field.onBlur} error={errors.dateOfBirth?.message} />
      )} />
      <Controller control={control} name="acceptTerms" render={({ field }) => (
        <View style={{ gap: 4 }}>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !!field.value }} accessibilityLabel="I agree to the Terms and Privacy Policy"
            onPress={() => field.onChange(!field.value)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 44 }}>
            <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: field.value ? c.primary : c.border, backgroundColor: field.value ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {field.value && <Check size={16} color={c.onPrimary} />}
            </View>
            <Text style={{ flex: 1 }}>
              I agree to the{' '}
              <Text style={{ color: c.link }} onPress={() => void Linking.openURL(webUrl('/legal/terms'))}>Terms</Text> and{' '}
              <Text style={{ color: c.link }} onPress={() => void Linking.openURL(webUrl('/legal/privacy'))}>Privacy Policy</Text>.
            </Text>
          </Pressable>
          {errors.acceptTerms && <Text variant="small" style={{ color: c.danger }}>{errors.acceptTerms.message}</Text>}
        </View>
      )} />
      <Button title="Create account" loading={isSubmitting} onPress={onSubmit} />
      <Text variant="muted" style={{ textAlign: 'center' }}>
        Already have an account? <Link href="/login" style={{ color: c.link }}>Log in</Link>
      </Text>
    </Screen>
  );
}
